# Kebetoo
[![Code Style](https://badgen.net/badge/code%20style/airbnb/fd5c63)](https://github.com/airbnb/javascript) [![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/bacarybruno/kebetoo-mobile)

Serverless services for [Kebetoo](https://github.com/bacarybruno/kebetoo-mobile) 

## Installation
Before starting, be sure to edit .env files to match your custom config

```sh
$ yarn install
$ yarn develop

```

#### Ffmpeg
```sh
$ mkdir layer
$ cd layer
$ curl -O https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz
$ tar xf ffmpeg-git-amd64-static.tar.xz
$ rm ffmpeg-git-amd64-static.tar.xz
$ mv ffmpeg-git-*-amd64-static ffmpeg
$ cd ..
```

## Tests
- Test s3 upload event
```sh
aws --endpoint http://localhost:4569 s3 cp ./tmp/input.mp4 s3://local-bucket/videos/input.mp4 --profile s3local
```