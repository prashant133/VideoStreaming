// how data response is handle and what we get
class ApiResPonse {
  constructor(statusCode, data, message = "Success") {
    (this.statusCode = statusCode),
      (this.data = data),
      (this.message = message);
    this.success = statusCode < 400;
  }
}
export { ApiResPonse };
