# Kebetoo
[![Code Style](https://badgen.net/badge/code%20style/airbnb/fd5c63)](https://github.com/airbnb/javascript) [![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/bacarybruno/kebetoo-mobile)

Serverless services for [Kebetoo](https://github.com/bacarybruno/kebetoo-mobile) 

## Installation
Before starting, be sure to edit .env files to match your custom config

```sh
$ yarn install
$ yarn develop

```

## Tests
- Test s3 upload event
```sh
aws --endpoint http://localhost:4569 s3 cp ./tmp/input.mp4 s3://local-bucket/videos/input.mp4 --profile s3local
```