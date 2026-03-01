pipeline {
    agent { label 'x64'}

    environment {
        GH_TOKEN = credentials('dodio_frontend_release_publish')
        PATH = "/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH"
        NODE_OPTIONS = "--max-old-space-size=4096"
    }

    stages {
        stage('Install Dependencies') {
            when { expression { env.TAG_NAME != null } }
            steps {
                echo "Building x64 release..."
                sh '''
                rm -rf node_modules
                npm ci
                '''
            }
        }

        stage('Test') {
            steps {
                echo "Running tests..."
                echo "Branch: ${env.BRANCH_NAME}"
                echo "Tag: ${env.TAG_NAME}"
            }
        }

        stage('Verify version matches tag') {
            when { expression { env.TAG_NAME != null } }
            steps {
                sh '''
                PACKAGE_VERSION=$(node -p "require('./package.json').version")
                TAG_VERSION=${TAG_NAME#v}

                if [ "$PACKAGE_VERSION" != "$TAG_VERSION" ]; then
                    echo "ERROR: package.json version ($PACKAGE_VERSION) does not match git tag ($TAG_VERSION)"
                    exit 1
                fi

                echo "Version verified: $PACKAGE_VERSION"
                '''
            }
        }

        stage('Build and Publish Release') {
            when {
                expression { env.TAG_NAME != null }
            }
            steps {
                echo "Building and releasing x64..."
                sh '''
                npm run build
                npx electron-builder --publish always
                '''
            }
        }
    }

    post {
        always {
            echo "Pipeline finished"
        }
    }
}
