# finger-grabber

finger-grabber is a DNS server and logging system that captures detailed visitor information, including IP addresses, browser details, and system information. The project also detects potential DNS leaks by logging requests to specific subdomains. The server provides an API to retrieve and clear logs, with password protection for these actions.

## Features

- **DNS Server**: Responds to DNS requests and logs potential DNS leaks.
- **Visitor Information Logging**: Collects detailed visitor information, including IP addresses, browser details, screen size, and available system fonts.
- **Secure Log Access**: Password-protected endpoints for retrieving and clearing logs.
- **Detailed Logging**: Logs include headers, timestamps, and DNS leak results.

![logtable](https://github.com/MAkcanca/finger-grabber/assets/9960579/d5662ff2-b8bd-4b65-8b66-cbe73c3388e2)
## Requirements

- Node.js
- npm (Node Package Manager)
- Express
- native-dns
- proper-lockfile
- cors
- body-parser
- nginx
- certbot (for SSL certificates)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/MAkcanca/finger-grabber.git
   cd finger-grabber
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following content:

   ```env
   PASSWORD=your_password
   SERVER_DOMAIN=your_server_domain
   SERVER_IP=your_server_ip
   ```

4. Start the DNS server:

   ```bash
   node leakdns.js
   ```

5. Start the Express server:

   ```bash
   node server.js
   ```

## Docker Setup

0. Create your .env file, you can take a look at .env.example

1. Build and start the Docker containers:

   ```bash
   docker-compose up --build
   ```

2. Access the application:

   - Access the Express server via `http://YOUR_DOMAIN`.

3. Access the logs via: `http://YOUR_DOMAIN/logstable.html`

## DNS Configuration

Update your DNS settings with the following entries:

- `A ns1.sub -> 134.209.230.201`
- `CNAME *.sub -> ns1.sub.YOURDOMAIN`
- `NS sub -> ns1.sub.YOURDOMAIN`

## Nginx Configuration

Create the following Nginx configuration files:

### /etc/nginx/sites-enabled/sub.yourdomain

```nginx
server {
  listen 80;
  listen [::]:80;
  root /var/www/html;
  index index.html index.htm index.nginx-debian.html;

  server_name ~^(.*)\.sub\.yourdomain$;

  location / {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

### /etc/nginx/sites-enabled/yourdomain

Before setting up the configuration below, ensure you have set up SSL certificates using Certbot:

```bash
sudo certbot --nginx -d yourdomain
```

Then, update the configuration:

```nginx
server {
  root /var/www/html;
  index index.html index.htm index.nginx-debian.html;

  server_name yourdomain;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
    add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
    add_header 'Access-Control-Allow-Credentials' 'true';
    proxy_cache_bypass $http_upgrade;
  }
}
```

## Hosts File Configuration

Update your `/etc/hosts` file:

```plaintext
SERVER_IP ns1.sub.YOURDOMAIN ns1
```

## Usage

### API Endpoints

- **POST /api/visitor-info**: Logs visitor information. This endpoint is automatically called by the client-side script in `index.html`.

- **POST /log**: Retrieves logs. Requires a password in the `Authorization` header.

  ```bash
  curl -X POST http://your_server_ip:3000/log -H "Authorization: Bearer your_password"
  ```

- **DELETE /log**: Clears the log file. Requires a password in the `Authorization` header.

  ```bash
  curl -X DELETE http://your_server_ip:3000/log -H "Authorization: Bearer your_password"
  ```

### Client-Side Script

The client-side script in `index.html` gathers visitor information and sends it to the server when the page loads. It collects:

- Local IP address
- Public IP address
- Screen size
- Browser information
- Available system fonts
- DNS leak test results

### Viewing Logs

1. Navigate to `logtable.html` in your browser.
2. Enter the password to view the logs.

## File Structure

- `leakdns.js`: DNS server script that handles DNS requests and logs potential DNS leaks.
- `server.js`: Express server script that handles visitor information logging and provides API endpoints.
- `index.html`: Client-side script that gathers visitor information.
- `logtable.html`: Interface for viewing and clearing logs.
- `public/`: Directory for static files.

## Security

- Ensure the `PASSWORD` environment variable is set to a strong, unique password.
- The log endpoints are protected by a password to prevent unauthorized access.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

## License

This project is licensed under the MIT License.
