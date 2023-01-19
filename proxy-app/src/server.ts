import express from 'express';
import got from 'got';
import { v4 as uuidv4 } from 'uuid';

//import { SSMClient, GetParameterCommand, GetParameterCommandOutput } from '@aws-sdk/client-ssm';

const app = express();

app.use(express.json());

const port = process.env.PORT || 3000;

app.all('/', async (_, res) => {

    let endpoint;
    const env = process.env.ENV || 'dev';

    if(env === 'dev') {

        const apiId = process.env.API_ID;
        endpoint = `http://localstack:4566/restapis/${apiId}/prod/_user_request_/`
        
    } else {
        
        endpoint =  process.env.ENDPOINT;
    }

    let responseMsg , statusCode;

    try{

        console.log(endpoint);
    
        if(typeof endpoint === 'undefined' || endpoint === null ){

            responseMsg = "no endpoint found";
            statusCode = 400;

        } else {

            const date = new Date();

            let day = date.getDate();
            let month = date.getMonth() + 1;
            let year = date.getFullYear();

            await got.post(endpoint , {
                json: {
                    msg: `${uuidv4()}`,
                    date: `${month}/${day}/${year}`
                }
            });

            responseMsg = "Success";
            statusCode = 200; 
        }   
    } catch(err) {
        let error: Error = err as Error;

        responseMsg = "Error: " + error.stack + "\n" + error.message;
        statusCode = 400;
    }
    
    const response = {
        statusCode,
        responseMsg
    };

    console.log(response);
    res.json(response);    
        
});

app.listen(port, ()=> {
    console.log(`Proxy Server started on port ${port}`)
})