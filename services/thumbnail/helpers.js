const sendStatus = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body),
})

module.exports = {
  sendStatus,
}
