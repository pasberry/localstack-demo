import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import { DockerImageAsset, NetworkMode } from 'aws-cdk-lib/aws-ecr-assets';

import * as ssm from 'aws-cdk-lib/aws-ssm';

import * as iam from 'aws-cdk-lib/aws-iam';

import * as path from 'path';
import { NetworkLoadBalancerProps } from './lambda_stack';

export class NetworkLoadBalancerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: NetworkLoadBalancerProps) {
        super(scope, id, props);

        const vpc = new ec2.Vpc(this, 'MyVpc', { 
            maxAzs: 2,
        });
      
        const cluster = new ecs.Cluster(this, 'ProxyCluster', { 
            vpc, 
        });
      
        
        /**
         * https://aws.plainenglish.io/deploying-a-fargate-cluster-with-localstack-and-the-aws-cdk-8791af2cdef1
         * https://github.com/aws-samples/aws-cdk-examples/blob/master/typescript/ecs/ecs-network-load-balanced-service/index.ts
         * https://github.com/aws/aws-cdk/issues/17269
         */

        //create the image of the proxy app
        const dockerAsset = new DockerImageAsset(this, 'ProxyImage', {
            directory: path.join(__dirname, '../proxy-app'),
            networkMode: NetworkMode.DEFAULT, 
        });

        const taskRole = new iam.Role(this, 'ECSTaskRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com') , 
        });

        taskRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [props.proxyGateway.arnForExecuteApi()],
            actions: ["execute-api:Invoke"]           
        }));

        //upload proxy app and install in ecs behind a network loadbalancer. 
        const ecsService = new ecsPatterns.NetworkLoadBalancedFargateService(this, "ECSService", {
            cluster,
            desiredCount: 2,            
            taskImageOptions: {
                image: ecs.ContainerImage.fromDockerImageAsset(dockerAsset),
                containerPort: 3000,                
                executionRole: taskRole,
                environment: {
                    ENDPOINT: props.proxyGateway.url,
                    PORT: '3000',
                    MESSAGE: 'Welcome to proxy app from localstack',
                    API_ID: props.proxyGateway.restApiId,
                    ENV: 'dev'
                }
            },
            publicLoadBalancer: true,
            assignPublicIp: true,
            serviceName:"proxy",
            
        });

        const EPHEMERAL_PORT_RANGE = ec2.Port.tcpRange(32768, 65535);

        //open proxy ports.
        ecsService.service.connections.allowFromAnyIpv4(EPHEMERAL_PORT_RANGE);

    }
}