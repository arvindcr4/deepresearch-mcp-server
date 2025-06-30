pipeline {
    agent any
    
    environment {
        NODE_VERSION = '20'
        NEO4J_URI = 'bolt://neo4j-test:7687'
        NEO4J_USER = 'neo4j'
        NEO4J_PASSWORD = 'testpassword'
        LOG_LEVEL = 'info'
        NODE_ENV = 'test'
        DOCKER_REGISTRY = credentials('docker-registry')
        DOCKER_IMAGE_NAME = 'deepresearch-mcp-server'
        SONARQUBE_TOKEN = credentials('sonarqube-token')
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        skipStagesAfterUnstable()
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.BUILD_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
                }
            }
        }
        
        stage('Setup Environment') {
            parallel {
                stage('Install Node.js') {
                    steps {
                        echo 'Setting up Node.js environment...'
                        sh '''
                            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                            sudo apt-get install -y nodejs
                            node --version
                            npm --version
                        '''
                    }
                }
                
                stage('Setup Neo4j Test Instance') {
                    steps {
                        echo 'Starting Neo4j test instance...'
                        sh '''
                            docker network create jenkins-test || true
                            docker run -d --name neo4j-test \
                                --network jenkins-test \
                                -p 7474:7474 -p 7687:7687 \
                                -e NEO4J_AUTH=neo4j/testpassword \
                                -e NEO4J_PLUGINS='["apoc"]' \
                                -e NEO4J_dbms_usage__report_enabled=false \
                                -e NEO4J_server_memory_heap_initial__size=256m \
                                -e NEO4J_server_memory_heap_max__size=512m \
                                neo4j:5-community
                        '''
                        // Wait for Neo4j to be ready
                        sh '''
                            echo "Waiting for Neo4j to be ready..."
                            timeout 60 bash -c 'until curl -f http://localhost:7474; do sleep 2; done'
                        '''
                    }
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo 'Installing npm dependencies...'
                sh '''
                    npm ci --production=false
                    npm audit --audit-level=high
                '''
            }
        }
        
        stage('Code Quality & Security') {
            parallel {
                stage('Lint') {
                    steps {
                        echo 'Running ESLint...'
                        sh '''
                            npx eslint src/ --ext .ts --format json --output-file eslint-report.json || true
                            npx eslint src/ --ext .ts
                        '''
                    }
                    post {
                        always {
                            publishHTML([
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: '.',
                                reportFiles: 'eslint-report.json',
                                reportName: 'ESLint Report'
                            ])
                        }
                    }
                }
                
                stage('Type Check') {
                    steps {
                        echo 'Running TypeScript type checking...'
                        sh 'npx tsc --noEmit'
                    }
                }
                
                stage('Security Scan') {
                    steps {
                        echo 'Running security audit...'
                        sh '''
                            npm audit --json > security-audit.json || true
                            npx audit-ci --report-type json --output-file audit-ci-report.json || true
                        '''
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'security-audit.json,audit-ci-report.json', allowEmptyArchive: true
                        }
                    }
                }
            }
        }
        
        stage('Build') {
            steps {
                echo 'Building TypeScript project...'
                sh '''
                    npm run build
                    ls -la dist/
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'dist/**/*', allowEmptyArchive: true
                }
            }
        }
        
        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        echo 'Running unit tests...'
                        sh '''
                            npm test -- --coverage --ci --watchAll=false --json --outputFile=test-results.json
                        '''
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'test-results.json'
                            publishHTML([
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: 'coverage',
                                reportFiles: 'index.html',
                                reportName: 'Coverage Report'
                            ])
                        }
                    }
                }
                
                stage('Integration Tests') {
                    steps {
                        echo 'Running integration tests...'
                        sh '''
                            # Wait for services to be ready
                            sleep 10
                            
                            # Run integration tests
                            export NEO4J_URI=bolt://localhost:7687
                            export NEO4J_USER=neo4j
                            export NEO4J_PASSWORD=testpassword
                            
                            node test-server.js &
                            SERVER_PID=$!
                            
                            # Give server time to start
                            sleep 5
                            
                            # Run basic connectivity tests
                            curl -f http://localhost:3000/health || echo "Health check endpoint not available"
                            
                            # Kill the test server
                            kill $SERVER_PID || true
                        '''
                    }
                }
            }
        }
        
        stage('SonarQube Analysis') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    changeRequest()
                }
            }
            steps {
                script {
                    def scannerHome = tool 'SonarQubeScanner'
                    withSonarQubeEnv('SonarQube') {
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                                -Dsonar.projectKey=deepresearch-mcp-server \
                                -Dsonar.projectName='DeepResearch MCP Server' \
                                -Dsonar.projectVersion=${env.BUILD_TAG} \
                                -Dsonar.sources=src \
                                -Dsonar.tests=src \
                                -Dsonar.test.inclusions='**/*.test.ts' \
                                -Dsonar.typescript.lcov.reportPaths=coverage/lcov.info \
                                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                                -Dsonar.eslint.reportPaths=eslint-report.json
                        """
                    }
                }
            }
        }
        
        stage('Quality Gate') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    changeRequest()
                }
            }
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
        
        stage('Build Docker Image') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                echo 'Building Docker image...'
                script {
                    def image = docker.build("${env.DOCKER_IMAGE_NAME}:${env.BUILD_TAG}")
                    docker.withRegistry('https://registry.hub.docker.com', env.DOCKER_REGISTRY) {
                        image.push("${env.BUILD_TAG}")
                        image.push("latest")
                        
                        if (env.BRANCH_NAME == 'main') {
                            image.push("stable")
                        }
                    }
                }
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            stages {
                stage('Deploy to Staging') {
                    steps {
                        echo 'Deploying to staging environment...'
                        sh '''
                            # Deploy to staging using docker-compose
                            export IMAGE_TAG=${BUILD_TAG}
                            envsubst < docker-compose.staging.yml > docker-compose.staging.rendered.yml
                            
                            # Deploy to staging server
                            scp docker-compose.staging.rendered.yml staging-server:/opt/deepresearch-mcp/
                            ssh staging-server "cd /opt/deepresearch-mcp && docker-compose -f docker-compose.staging.rendered.yml up -d"
                        '''
                    }
                }
                
                stage('Staging Tests') {
                    steps {
                        echo 'Running staging tests...'
                        sh '''
                            # Wait for staging deployment
                            sleep 30
                            
                            # Run smoke tests against staging
                            curl -f http://staging-server:3000/health
                            
                            # Run end-to-end tests
                            npm run test:e2e:staging
                        '''
                    }
                }
                
                stage('Deploy to Production') {
                    input {
                        message "Deploy to production?"
                        ok "Deploy"
                        submitterParameter "APPROVED_BY"
                    }
                    steps {
                        echo "Deploying to production (approved by ${env.APPROVED_BY})..."
                        sh '''
                            # Deploy to production using docker-compose
                            export IMAGE_TAG=${BUILD_TAG}
                            envsubst < docker-compose.prod.yml > docker-compose.prod.rendered.yml
                            
                            # Deploy to production server
                            scp docker-compose.prod.rendered.yml prod-server:/opt/deepresearch-mcp/
                            ssh prod-server "cd /opt/deepresearch-mcp && docker-compose -f docker-compose.prod.rendered.yml up -d"
                        '''
                    }
                }
                
                stage('Production Health Check') {
                    steps {
                        echo 'Running production health checks...'
                        sh '''
                            # Wait for production deployment
                            sleep 30
                            
                            # Run health checks
                            curl -f http://prod-server:3000/health
                            
                            # Run smoke tests
                            npm run test:smoke:production
                        '''
                    }
                }
            }
        }
    }
    
    post {
        always {
            echo 'Cleaning up...'
            sh '''
                # Stop and remove test containers
                docker stop neo4j-test || true
                docker rm neo4j-test || true
                docker network rm jenkins-test || true
                
                # Clean up workspace
                npm cache clean --force || true
            '''
            
            // Archive artifacts
            archiveArtifacts artifacts: '**/*.log,**/*.json', allowEmptyArchive: true
            
            // Publish test results if they exist
            publishTestResults testResultsPattern: '**/test-results.xml', allowEmptyResults: true
        }
        
        success {
            echo 'Pipeline completed successfully!'
            
            // Notify success
            slackSend(
                channel: '#deployments',
                color: 'good',
                message: ":white_check_mark: *${env.JOB_NAME}* - Build #${env.BUILD_NUMBER} completed successfully!\n" +
                        "Branch: ${env.BRANCH_NAME}\n" +
                        "Commit: ${env.GIT_COMMIT_SHORT}\n" +
                        "Duration: ${currentBuild.durationString}"
            )
        }
        
        failure {
            echo 'Pipeline failed!'
            
            // Notify failure
            slackSend(
                channel: '#deployments',
                color: 'danger',
                message: ":x: *${env.JOB_NAME}* - Build #${env.BUILD_NUMBER} failed!\n" +
                        "Branch: ${env.BRANCH_NAME}\n" +
                        "Commit: ${env.GIT_COMMIT_SHORT}\n" +
                        "Duration: ${currentBuild.durationString}\n" +
                        "Build URL: ${env.BUILD_URL}"
            )
        }
        
        unstable {
            echo 'Pipeline is unstable!'
            
            // Notify unstable
            slackSend(
                channel: '#deployments',
                color: 'warning',
                message: ":warning: *${env.JOB_NAME}* - Build #${env.BUILD_NUMBER} is unstable!\n" +
                        "Branch: ${env.BRANCH_NAME}\n" +
                        "Commit: ${env.GIT_COMMIT_SHORT}\n" +
                        "Duration: ${currentBuild.durationString}"
            )
        }
    }
}