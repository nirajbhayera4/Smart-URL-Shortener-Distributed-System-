const mysql=require('mysql2');
const db=mysql.createConnection(
    {
        host:'localhost',
        user:'root',
        password:'219929',
        database:'url_shortener'
    }
);
module.exports=db;
