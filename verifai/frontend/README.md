# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## VERIFAI face recognition (in-browser)

VERIFAI uses `@vladmandic/face-api` in the browser:

- Enroll users from `/users` by **capturing** or **uploading** a photo.
- A face embedding (`faceDescriptor`) is computed and stored in `localStorage` together with the photo.
- `/scan` runs recognition against enrolled users every ~1.5s and overlays boxes/labels on a canvas.

### Download models to `/public/models`

From `verifai/frontend`:

```bash
npm run download-models
```

This downloads:

- `ssd_mobilenetv1_model-weights_manifest.json` (+ `.bin` shards)
- `face_landmark_68_model-weights_manifest.json` (+ `.bin` shards)
- `face_recognition_model-weights_manifest.json` (+ `.bin` shards)

into `verifai/frontend/public/models/`.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
