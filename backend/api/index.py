from app import app as flask_app

def application(environ, start_response):
    # Ensure Flask sees '/api/...' paths while deployed under Vercel '/api' function
    path = environ.get('PATH_INFO', '') or ''
    if not path.startswith('/api'):
        environ['PATH_INFO'] = '/api' + path
    return flask_app.wsgi_app(environ, start_response)

# Vercel Python runtime looks for a WSGI callable named 'app' or 'application'.
app = application
