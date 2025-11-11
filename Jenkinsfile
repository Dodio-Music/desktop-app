pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                echo "Running tests..."
                echo "This is build: ${env.BRANCH_NAME}"
            }
        }

        stage('Build') {
            when {
                tag('*') 
            }
            steps {
                echo "Building for release..."
                echo "Building tag: ${env.BRANCH_NAME}"
            }
        }

        stage('Release') {
            when {
                tag('*')
            }
            steps {
                echo "Releasing version..."
                echo "Releasing tag: ${env.BRANCH_NAME}"
            }
        }
    }

    post {
        always {
            echo "Pipeline finished"
        }
    }
}
