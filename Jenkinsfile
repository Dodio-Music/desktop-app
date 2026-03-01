pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                echo "Running tests..."
                echo "Branch: ${env.BRANCH_NAME}"
                echo "Tag: ${env.TAG_NAME}"
            }
        }
    }

    post {
        always {
            echo "Pipeline finished"
        }
    }
}
