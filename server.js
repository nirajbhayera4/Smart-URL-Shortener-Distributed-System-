const express =require('express');
const {nanoid}= require('nanoid');
const app=express();
const PORT=3000;


app.use(express.json());

const urlDatabase={};

//POST -CREATES SHORT CODE

app.post('/shorten',(req,res)=>{
    const {longUrl}=req.body;
    if(!longUrl){
        return res.status(400).json({error:'please provide a long url'});
    }

    const code=nanoid(6);;

    urlDatabase[code]=longUrl;

    res.json({
        shortUrl:`http://localhost:${PORT}/${code}`,
        code: code
    });
});

//GET

app.get('/:code',(req,res)=>{
    const {code}=req.params;
    const originalUrl=urldatabase[code];

    if(originalUrl){
        return res.redirect(originalUrl);
    }
    else{
        return res.status(404).json({error:'url not found'});
    }
});
app.listen(PORT,()=>{
    console.log(`Server is running at http://localhost:${PORT}`);
});
