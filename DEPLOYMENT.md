# Bluehost deployment

The production build is configured for:

`https://pnminfotech.com/rentmanagementsoftware`

Run `npm run build` from this folder. Upload the **contents** of the generated `build` folder to:

`public_html/rentmanagementsoftware/`

Keep the generated `.htaccess` file in that folder. It lets direct links such as `/rentmanagementsoftware/login` and `/rentmanagementsoftware/tenant-intake` open the React application.

The production web build sends API requests to `http://localhost:8000/api`. The backend deployment must allow `https://pnminfotech.com` in CORS and use these values:

```env
FRONTEND_BASENAME=rentmanagementsoftware
TENANT_FORM_BASE_URL=https://pnminfotech.com/rentmanagementsoftware/tenant-intake
```

If the backend is hosted on another domain or subdomain, update `REACT_APP_API_BASE` and `REACT_APP_API_ORIGIN` in `.env.production` before building.
