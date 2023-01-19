import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as lambda from 'aws-cdk-lib/aws-lambda';

import * as apigw from 'aws-cdk-lib/aws-apigateway';

import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';

import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';


export class LambdaStack extends cdk.Stack {

  public readonly apiGateway: apigw.LambdaRestApi ;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //configure sqs queue
    const sqsQ = new sqs.Queue(this, 'MySqsQueue', {
      queueName : "msgQueue"
    });    
    
    //lambda function to put messages on queue
    const putMsgOnSQSFunction =  new lambda.Function(this, 'putSnsMessageFunction' , {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('retrieve-msg-lambda'),
      handler: 'sqs_put.handler',
      environment: {
        QUEUE_URL : sqsQ.queueUrl
      },
      functionName:"putSnsMessageFunction"
    });

    //put the lambda function behind a api gateway
    const gateway = new apigw.LambdaRestApi(this, 'WelcomeEndpoint', {
      handler: putMsgOnSQSFunction,
      restApiName:'welcome'      
      
    });

    this.apiGateway = gateway;

    //create the dynamo db table
    const table = new dynamodb.Table(this, 'Messages', {
      partitionKey: { name: 'msg', type: dynamodb.AttributeType.STRING },
      tableName: "msgTable"
    });

    //create the dynamo
    const storeMsgInDynamoDBFunction = new lambda.Function(this, 'storeMsgInDynamoFunction', {

      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('store-msg-lambda'),
      handler: 'store_dynamo.handler',
      timeout: cdk.Duration.minutes(5),
      environment: {
          TABLE_NAME : table.tableName
      },
      functionName:"storeMsgInDynamoFunction"  
    });

    //add the queue as an event source
    storeMsgInDynamoDBFunction.addEventSource(new SqsEventSource(sqsQ));

    //grant the function full access to the table
    table.grantReadWriteData(storeMsgInDynamoDBFunction);
 
  }
}

export interface NetworkLoadBalancerProps extends cdk.StackProps {
  proxyGateway: apigw.LambdaRestApi
}