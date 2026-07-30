const bcrypt = require('bcryptjs');
const expectedHash = '$2a$10$X8h1jBqPqEQxV.6lY7bQz.Yz7e8TwKWVxJvqDkR5YJ0gLZXg1K1LS';
bcrypt.compare('admin123', expectedHash).then(res => console.log('admin123', res));
bcrypt.compare('admin', expectedHash).then(res => console.log('admin', res));
bcrypt.compare('password', expectedHash).then(res => console.log('password', res));
