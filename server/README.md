# Supabase proxy removed

The original local proxy that forwarded uploads to Supabase Storage has been removed from this project.

This repository now uses Firebase Storage for uploads and hosting the `galeria.json` file. The `server` folder contains a small placeholder server (`index.js`) for convenience — you can safely delete the entire `server/` directory if you don't need it.

If you need a custom server to handle uploads, implement it to write files to Firebase Storage or another chosen backend and ensure you do not embed service-role secrets in client-side code.
