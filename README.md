# S3 antivirus ClamAV scanner

This is S3 antivirus which uses ClamAV scanner. It works on lambda functions and limited resource.

This project is implemented on top of https://github.com/truework/lambda-s3-antivirus/. As ClamAV installed package is large and exceed lambda limitation. So, this project requires S3 to store the definition files (antivirus files) and then `antivirusApp` lambda function pull those files to scan the virus.

Furthermore, as it is required to consistently update up-to-date antivirus definition so that we could protect new kind of virus. This project also has `downloadDefinition` part which is periodically triggered by CloudWatch to download and update ClamAV definition and store on S3.

Below is a brief explanation of what we have generated for you:

## Project Structures

```bash
.
├── README.MD                   <-- This instructions file
├── event.json                  <-- API Gateway Proxy Integration event payload
├── aws                         <-- AWS SAM (Cloudformation) template
│   └── codepipeline-cloudformation.yaml   <-- CloudFormation template to create CI/CD Pipeline for this project
│
├── s3Antivirus                 <-- Source code for a lambda function (NodeJS 10.x)
│   └── antivirusApp.js         <-- Lambda function code for antivirus part
│   └── downloadDefinitionApp.js    <-- Lambda function code for update definition part
│   └── constants.js            <-- constants and environment variables
│   └── freshclam.conf          <-- ClamAV configuration file
│   └── package.json            <-- NodeJS dependencies and scripts
│   └── clamav
│       └── antivirus.js        <-- Scan Virus script
│       └── clamav.js           <-- ClamAV Definition related script
│   └── utils
│       └── s3.js               <-- S3 script
│       └── utils.js            <-- Utilities script
│
├── .gitignore                  <-- GIT Ignore file
├── buildspec.yml               <-- Build Spec file for AWS CodePipeline
```

## Requirements

-   [NodeJS 10.10+ installed](https://nodejs.org/en/download/releases/)
-   [Docker installed](https://www.docker.com/community-edition)

## Developing

To develop `clamav-scanner-lambda`, the system is implemented with Lambda functions NodeJS 10.x please follow the step below.

1. Run `amazonlinux` docker container, download `ClamAV`, and bundle lambda project `lambda.zip`

```sh
./scripts/build_lambda.sh
```

## Deploying

After getting `lambda.zip` file, you can deploy on AWS lambda function

## Authors

-   **Truework** - _Original Creator of this project_
-   **Nattavit Kamoltham** - _Solutions & Integration Architect at FWD Innovation Center_
