#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LambdaStack } from '../lib/lambda_stack';
import { NetworkLoadBalancerStack } from '../lib/nlb_stack';

const app = new cdk.App();
const lambdaStack = new LambdaStack(app, 'LambdaStack', {});
new NetworkLoadBalancerStack(app, 'NLBStack', {proxyGateway : lambdaStack.apiGateway});