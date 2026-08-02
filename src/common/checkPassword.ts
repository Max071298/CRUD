import * as bcrypt from 'bcrypt';

export async function checkPassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}
