// (c) 2023 Hajime Yamasaki Vukelic

let http = require('node:http')
let fs = require('node:fs')
let path = require('node:path')
let crypto = require('node:crypto')


let docroot = path.resolve(process.argv[2] || process.cwd())
let port = Number(process.env.WWW_PORT || 8080)
let host = process.env.WWW_HOST || '127.0.0.1'
let prefix = process.env.WWW_PREFIX || '/'
let indexFilename = process.env.WWW_INDEX || 'index.html'
let ssePathname = '/' + crypto.randomUUID()
let sseScriptPathname = ssePathname + '.js'


let fileChangeBus = new EventTarget()
let server 
let watcher
let watcherDebounceTimer




if (require.main === module) boot()




function boot() {
	if (!prefix.endsWith('/')) prefix += '/'
	fs.stat(docroot, function (err, stats) {
		if (err || !stats.isDirectory()) cannotStart(err)
		else doStart()
	})
}

function cannotStart() {
	console.error(`There was an error attempting to access ${docroot}`)
	process.exit(1)
}

function doStart() {
	watcher = fs.watch(docroot, handleFileChange)
	server = http.createServer(handleRequest).listen(port, host, notifyStart)
	process.on('SIGTERM', handleTerm)
	process.on('SIGINT', handleTerm)
}

function notifyStart() {
	console.log(`Serving the contents of ${docroot}

    ---->  http://${host}:${port}${prefix}  <----
`)
}

function handleFileChange() {
	clearTimeout(watcherDebounceTimer)
	watcherDebounceTimer = setTimeout(function () {
		console.log('Filesystem change detected. Notifying observers')
		fileChangeBus.dispatchEvent(new Event('change'))
	}, 100)
}

function handleTerm() {
	console.log('Shutting down server...')
	watcher.close()
	server.close()
	server.closeAllConnections()
	server.on('close', quit)
}


function quit() {
	console.log('Bye!')
	process.exit(0)
}


function handleRequest(request, response) {
	console.log(`${request.method} ${request.url}`)
	let url = new URL(request.url, `http://${host}:${port}`)

	if (url.pathname == ssePathname) {
		makeSseResponse(request, response)
	} 

	else if (url.pathname == sseScriptPathname) {
		makeSseScriptResponse(request, response)
	}

	else if (url.pathname.startsWith(prefix)) {
		findViableFilePath(url.pathname.slice(prefix.length - 1), function (err, filename) {
			if (err) makeCriticalResponse(request, response, err)
			else if (!filename) makeMissingResourceResponse(request, response)
			else makeResourceResponse(request, response, filename)
		})
	}

	else {
		makeMissingResourceResponse(request, response)
	}
}

function makeResourceResponse(request, response, filename) {
	let extName = path.extname(filename)
	let mimeType = mimeTypes[extName] || 'application/octet-stream'
	response.statusCode = 200
	response.setHeader('Cache-Control', 'no-store')
	response.setHeader('Content-Type', mimeType)
	fs.readFile(filename, function (err, buffer) {
		if (err) makeCriticalResponse(request, response, err)
		else if (mimeType == 'text/html') makePatchedHtmlResponse(request, response, buffer)
		else response.end(buffer)
	})
}

function makePatchedHtmlResponse(request, response, buffer) {
	let html = buffer.toString('utf-8')
	html = html.replace('</body>', `<script src="${sseScriptPathname}"></script>\n</body>`)
	response.end(html)
}

function makeSseResponse(request, response) {
	response.statusCode = 200
	response.setHeader('Cache-Control', 'no-store')
	response.setHeader('Content-Type', 'text/event-stream')

	function handleChange() {
		response.write('data: changed\n\n')
	}

	fileChangeBus.addEventListener('change', handleChange)
	request.on('close', function () {
		console.log('Client disconnected from watcher')
		fileChangeBus.removeEventListener('change', handleChange)
	})
	console.log('Client connected to watcher')
}

function makeSseScriptResponse(request, response) {
	response.statusCode = 200
	response.setHeader('Content-Type', 'text/javascript')
	response.end(`new EventSource('${ssePathname}').onmessage = location.reload.bind(location)`)
}

function makeMissingResourceResponse(request, response) {
	response.statusCode = 404
	response.setHeader('Content-Type', 'text/plain')
	response.end('Not found')
}

function makeCriticalResponse(request, response, err) {
	console.error('Error while serving file', err)
	response.statusCode = 500
	response.setHeader('Content-Type', 'text/plain')
	response.end('Internal server error')
}

function findViableFilePath(requestPath, callback) {
	let requestedFsFilename = getFilePath(requestPath)
	fs.stat(requestedFsFilename, checkTheRequestedFilename)
	function checkTheRequestedFilename(err, stats) {
		if (err) callback()
		else if (stats.isFile()) callback(null, requestedFsFilename)
		else if (stats.isDirectory()) {
			requestedFsFilename = path.resolve(requestedFsFilename, indexFilename)
			fs.stat(requestedFsFilename, checkTheRequestedFilename)
		}
		else callback()
	}
}

function getFilePath(requestPath) {
	let fullFilename = path.resolve(docroot, requestPath.slice(1))
	if (!isWithinDocroot(fullFilename)) return ''
	return fullFilename
}

function isWithinDocroot(filename) {
	let relFilename = path.relative(docroot, filename)
  	return !relFilename.startsWith('..') && !path.isAbsolute(relFilename)
}

let mimeTypes = {
  '.aac': 'audio/aac',
  '.abw': 'application/x-abiword',
  '.arc': 'application/x-freearc',
  '.avif': 'image/avif',
  '.avi': 'video/x-msvideo',
  '.azw': 'application/vnd.amazon.ebook',
  '.bin': 'application/octet-stream',
  '.bmp': 'image/bmp',
  '.bz': 'application/x-bzip',
  '.bz2': 'application/x-bzip2',
  '.cda': 'application/x-cdf',
  '.csh': 'application/x-csh',
  '.css': 'text/css',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.eot': 'application/vnd.ms-fontobject',
  '.epub': 'application/epub+zip',
  '.gz': 'application/gzip',
  '.gif': 'image/gif',
  '.htm': 'text/html',
  '.html': 'text/html',
  '.ico': 'image/vnd.microsoft.icon',
  '.ics': 'text/calendar',
  '.jar': 'application/java-archive',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.jsonld': 'application/ld+json',
  '.mid': 'audio/midi, audio/x-midi',
  '.midi': 'audio/midi, audio/x-midi',
  '.mjs': 'text/javascript',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.mpeg': 'video/mpeg',
  '.mpkg': 'application/vnd.apple.installer+xml',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.oga': 'audio/ogg',
  '.ogv': 'video/ogg',
  '.ogx': 'application/ogg',
  '.opus': 'audio/opus',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.php': 'application/x-httpd-php',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.rar': 'application/vnd.rar',
  '.rtf': 'application/rtf',
  '.sh': 'application/x-sh',
  '.svg': 'image/svg+xml',
  '.tar': 'application/x-tar',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.ts': 'video/mp2t',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.vsd': 'application/vnd.visio',
  '.wav': 'audio/wav',
  '.weba': 'audio/webm',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xhtml': 'application/xhtml+xml',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xml': 'application/xml',
  '.xul': 'application/vnd.mozilla.xul+xml',
  '.zip': 'application/zip',
  '.3gp': 'video/3gpp',
  '.3g2': 'video/3gpp2',
  '.7z': 'application/x-7z-compressed'
}
