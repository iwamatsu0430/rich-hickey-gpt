import { verbose, Database } from "sqlite3";

export const init = () => {
  const sqlite3 = verbose();
  return new sqlite3.Database("data.db");
};

export const list = async (db: Database, sql: string) => {
  const result: Array<any> = [];
  return new Promise<Array<any>>((resolve, reject) => {
    db.each(
      sql,
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          result.push(row);
        }
      },
      () => resolve(result)
    );
  });
};

export const exec = async (db: Database, sql: string) =>
  new Promise((resolve) => {
    db.exec(sql, resolve);
  });

export default {
  init,
  list,
  exec,
};
