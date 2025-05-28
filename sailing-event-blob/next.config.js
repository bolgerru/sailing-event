module.exports = {
  reactStrictMode: true,
  env: {
    BLOB_STORAGE_CONNECTION_STRING: process.env.BLOB_STORAGE_CONNECTION_STRING,
    BLOB_CONTAINER_NAME: process.env.BLOB_CONTAINER_NAME,
  },
};