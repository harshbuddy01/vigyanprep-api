
import bcrypt from 'bcryptjs';

const password = 'admin';  // Let's set it to 'admin' as it's easier
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('Password: admin');
console.log('Hash:', hash);
