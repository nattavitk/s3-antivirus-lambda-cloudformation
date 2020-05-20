# S3 antivirus ClamAV scanner

**⛔️🚫NOTE: This project is obsoleted as AWS does not have Lambda NodeJS 8 anymore. I will check and solve it.⛔️🚫**

This is S3 antivirus which uses ClamAV scanner. It works on lambda functions and limited resource.

As ClamAV installed package is large and exceed lambda limitation. So, this project requires S3 to store the definition files (antivirus files).

In order to use this ClamAV scanner, you have to create 2 lambda functions from the same lambda zip file.

1. **Virus scanner** lambda function (antivirusApp)

2. **Virus definition updater** lambda function (downloadDefinition)

## How it works

To scan S3 file, it starts from invoking `antivirusApp.lambdaHandleEvent` with S3 file (bucket name and key), then it pulls virus definition files from S3 and scan the file. After that it returns the scanning result. This can be triggered by S3 event.

Once the event triggers the virus scanner Lambda, it immediately scans that file.

- If the file is clean, the scanner tags the file with `virusScanTimestamp` and `virusScanStatus`

- If the file is infected, the scanner tags and moves the file to `infected` folder and replace that file in the original folder with PDF dummy to remain the file existence

To update virus definition, it is needed to invoke `downloadDefinitionApp.lambdaHandleEvent` then it run `clamav` command to download latest virus definition and stores in S3 definition bucket. This can be triggered by CloudWatch event.

## Project Structures

```bash
.
├── README.MD                   <-- This instructions file
├── aws                         <-- AWS SAM (Cloudformation) template
│   └── cloudformation-deployment.yaml   <-- CloudFormation template
│
├── s3Antivirus                 <-- Source code for a lambda function (NodeJS 8.10)
│   └── assets
│       └── ReplacementVirus.pdf    <-- Replacement file to defected one
│   ├── antivirusApp.js         <-- Lambda function code for antivirus part
│   ├── downloadDefinitionApp.js    <-- Lambda function code for update definition part
│   ├── constants.js            <-- constants and environment variables
│   ├── freshclam.conf          <-- ClamAV configuration file
│   ├── package.json            <-- NodeJS dependencies and scripts
│   └── clamav
│       ├── antivirus.js        <-- Scan Virus script
│       └── clamav.js           <-- ClamAV Definition related script
│   └── utils
│       ├── s3.js               <-- S3 script
│       └── utils.js            <-- Utilities script
│
├── scripts
│   └── build.sh                <-- Script to build the lambda zip file with ClamAV binary files
│   └── clean.sh                <-- Script to delete docker and temp folders
│
├── .gitignore                  <-- GIT Ignore file
├── buildspec.yml               <-- Build Spec file for AWS CodePipeline
```

## Requirements

- This ClamAV is only compatible with NodeJS 8.10 runtime lambda

### Development

- [NodeJS 8.10+ installed](https://nodejs.org/en/download/releases/)
- [Docker installed](https://www.docker.com/community-edition)

### AWS resources

- S3 #1 `Virus definition store`
- S3 #2 `Lambda zip file store` (Optional)
- S3 #3 `File to be scanned store` (Only for IAM)
- Lambda #1 `Virus scanner`
- Lambda #2 `Virus definition updater`
- CloudWatch event `Virus definition updater trigger`

### IAM Requirement

1. Lambda #1 `Virus scanner`

   - S3 #1 `Virus definition store` :: Get
   - S3 #2 `Lambda zip file store` :: Get
   - S3 #3 `File to be scanned store` :: Get + Put

2. Lambda #2 `Virus definition updater`
   - S3 #1 `Virus definition store` :: Put
   - S3 #2 `Lambda zip file store` :: Get

## Developing

To develop `clamav-scanner-lambda`, the system is implemented with Lambda functions NodeJS 8.10 please follow the step below.

1. Run `amazonlinux` docker container, download `ClamAV`, and bundle lambda project `lambda.zip`

```sh
./scripts/build.sh
```

## Deploying

### Using as standalone ClamAV lambda scanner

1.  After getting `clamav_lambda_v2.zip` file, you can deploy on AWS lambda function

2.  Set 2 mandatory environment variables

        CLAMAV_BUCKET_NAME - Bucket where the definitions are stored
        PATH_TO_AV_DEFINITIONS - Folder where the definitions are stored.

### Using as ClamAV lambda scanner with other projects

1.  Make sure that you have lambda zip file storing on S3

2.  Copy `cloudformation-deployment.yaml` file from **aws** folder and paste in destination project

3.  From the cloudformation above, it requires S3 parameters below

    1.  S3 that stores lambda zip file

        - _S3 bucket name_ - can import from another stack (and use it for ARN)

        - _S3 bucket key_ (zipped Lambda filename) - can import from another stack

    2.  S3 to store ClamAV definition files

        - _S3 bucket name_ (use it for ARN also)

        - _S3 bucket key_ - folder where the definitions are stored

    3.  S3 that stores files which we need ClamAV to scan the virus _(only for IAM role purpose)_

        - _S3 bucket name_ - can import from another stack (and use it for ARN)

        - _S3 bucket key_ - folder where the target folder

## Contribution

This project is implemented on top of https://github.com/truework/lambda-s3-antivirus/. Cheers https://github.com/truework

## Maintainer

- **Nattavit Kamoltham**
