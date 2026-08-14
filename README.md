# Hair Coloring App

![Opera Snapshot_2024-04-14_120856_hair-coloring-app-v1 glitch me](https://github.com/Ys-sudo/hair-coloring-app/assets/57189926/8fffe5e2-9819-4ece-9742-7c8758016180)

Browser-based hair color preview built with MediaPipe Image Segmenter and
JavaScript.

## Features

- Real-time webcam segmentation.
- Local image upload with no server upload.
- Color, blur, and opacity controls.
- Self-hosted MediaPipe hair segmentation model.
- Responsive browser interface.

## Run locally

The browser must load the model over HTTP rather than directly from the file
system:

```sh
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Privacy

Camera frames and selected images are processed locally in the browser. The
application does not upload them.

## Third-party software

This project uses
[`@mediapipe/tasks-vision`](https://www.npmjs.com/package/@mediapipe/tasks-vision)
and the official MediaPipe hair segmentation model. Third-party components
retain their respective licenses. See
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## License

Original project code and assets are available under the
[MIT License](LICENSE).
