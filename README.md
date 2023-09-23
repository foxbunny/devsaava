# Devsaava

Static site server with auto-reload for developing good ol' client-side apps.

## How to use

Start the server with:

`node server.js`

Seriously, it's just one file. You don't need NPM.

## Dependencies

None.

## Options

Yes, we have those. By default, the server will serve the contents from the
current working directory. You can specify a different path:

```shell
node server.js /some/path
```

Other options are set using environment variables (yes, sucks for Windows 
users that aren't using WSL yet, we may add command line switches later if 
enough people cry about this).

- `WWW_PORT` - port number (default: `8080`)
- `WWW_HOST` - hostname (default: `'127.0.0.1'`)
- `WWW_PREFIX` - URL path prefix (default: `'/'`)
- `WWW_INDEX` - directory index file (default: `'index.html'`)

## Missing features

Yes, we have those.

For starters, there's no caching. This is intentional. It's a dev server!

There is no compression. Also intentional. You don't need it locally, and
makes it a bit easier to spot big payloads.

There is no support for client-side routing that uses URL paths, rather than
hashes. In 2020's (and later) I think you shouldn't be doing it if you're not
also doing SSR. Don't bother with a PR.

Colorful logging. This crap was developed using Notepad. Not Notepad++, just
Notepad. That's how much I care about colors.

## Bugs

Yes, we have those. Probably. This is toy project I use for myself. I don't 
really need this to be any better than it is.

If you spot a bug, though, I will be more than happy to fix it!

## License

This code is released under the terms of the MIT license.

TL;DR Do whatever you want with it, but don't come crying to me if something
breaks and your files get deleted.


