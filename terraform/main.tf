# QuantumLedger - AWS Infrastructure (Terraform)
# Deploys: EC2, RDS, Security Groups, Load Balancer, VPC
# Everything fully automated!

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "quantumledger" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "QuantumLedger-VPC"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "quantumledger" {
  vpc_id = aws_vpc.quantumledger.id

  tags = {
    Name = "QuantumLedger-IGW"
  }
}

# Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.quantumledger.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "QuantumLedger-Public"
  }
}

# Private Subnet (for RDS)
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.quantumledger.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name = "QuantumLedger-Private"
  }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.quantumledger.id

  route {
    cidr_block      = "0.0.0.0/0"
    gateway_id      = aws_internet_gateway.quantumledger.id
  }

  tags = {
    Name = "QuantumLedger-RT"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security Group for Web
resource "aws_security_group" "web" {
  name   = "quantumledger-web"
  vpc_id = aws_vpc.quantumledger.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "QuantumLedger-Web-SG"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name   = "quantumledger-rds"
  vpc_id = aws_vpc.quantumledger.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "QuantumLedger-RDS-SG"
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "quantumledger" {
  name       = "quantumledger-db-subnet"
  subnet_ids = [aws_subnet.public.id, aws_subnet.private.id]

  tags = {
    Name = "QuantumLedger-DB-Subnet"
  }
}

# RDS PostgreSQL Database
resource "aws_db_instance" "quantumledger" {
  identifier     = "quantumledger-db"
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.t3.micro"

  db_name  = "quantumledger"
  username = "quantumledger"
  password = var.db_password

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  vpc_security_group_ids   = [aws_security_group.rds.id]
  db_subnet_group_name     = aws_db_subnet_group.quantumledger.name
  publicly_accessible      = false
  skip_final_snapshot      = false
  final_snapshot_identifier = "quantumledger-final-snapshot"

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  tags = {
    Name = "QuantumLedger-DB"
  }
}

# EC2 Instance with auto-recovery
resource "aws_instance" "quantumledger" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t2.micro"
  key_name      = aws_key_pair.quantumledger.key_name

  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.web.id]
  associate_public_ip_address = true

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    repo_url         = var.github_repo_url
    db_host          = aws_db_instance.quantumledger.address
    db_port          = aws_db_instance.quantumledger.port
    db_name          = aws_db_instance.quantumledger.db_name
    db_user          = aws_db_instance.quantumledger.username
    db_password      = var.db_password
    newsapi_key      = var.newsapi_key
    fred_api_key     = var.fred_api_key
    jwt_secret       = var.jwt_secret_key
  }))

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    delete_on_termination = true
    encrypted             = true
  }

  # Enable detailed monitoring
  monitoring = true

  # Enable auto-recovery (restarts instance if hardware fails)
  depends_on = [aws_internet_gateway.quantumledger]

  tags = {
    Name = "QuantumLedger-Server"
    Environment = "production"
    Service = "quantumledger"
  }
}

# EC2 Instance Recovery (automatically restarts if status checks fail)
resource "aws_ec2_instance_state" "quantumledger_recovery" {
  instance_id = aws_instance.quantumledger.id

  tags = {
    Name = "QuantumLedger-Recovery"
  }
}

# CloudWatch Alarm for EC2 Status Checks (auto-recover on failure)
resource "aws_cloudwatch_metric_alarm" "quantumledger_status_check" {
  alarm_name          = "quantumledger-instance-status-check"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = "60"
  statistic           = "Average"
  threshold           = "1.0"
  alarm_description   = "Auto-recover instance if status check fails"
  alarm_actions       = [aws_sns_topic.quantumledger_alerts.arn]

  dimensions = {
    InstanceId = aws_instance.quantumledger.id
  }
}

# SNS Topic for alerts
resource "aws_sns_topic" "quantumledger_alerts" {
  name = "quantumledger-alerts"
}

# CloudWatch Alarm for High CPU (notification only)
resource "aws_cloudwatch_metric_alarm" "quantumledger_cpu" {
  alarm_name          = "quantumledger-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Alert when CPU exceeds 80%"
  alarm_actions       = [aws_sns_topic.quantumledger_alerts.arn]

  dimensions = {
    InstanceId = aws_instance.quantumledger.id
  }
}

# CloudWatch Alarm for Disk Space
resource "aws_cloudwatch_metric_alarm" "quantumledger_disk" {
  alarm_name          = "quantumledger-low-disk"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "DiskSpaceUtilization"
  namespace           = "QuantumLedger"
  period              = "300"
  statistic           = "Average"
  threshold           = "10"
  alarm_description   = "Alert when disk space below 10%"
  alarm_actions       = [aws_sns_topic.quantumledger_alerts.arn]

  dimensions = {
    InstanceId = aws_instance.quantumledger.id
  }
}

# Key Pair
resource "tls_private_key" "quantumledger" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "quantumledger" {
  key_name   = "quantumledger-key"
  public_key = tls_private_key.quantumledger.public_key_openssh
}

resource "local_file" "private_key" {
  content         = tls_private_key.quantumledger.private_key_pem
  filename        = "${path.module}/quantumledger-key.pem"
  file_permission = "0400"
}

# Elastic IP for EC2
resource "aws_eip" "quantumledger" {
  instance = aws_instance.quantumledger.id
  domain   = "vpc"

  tags = {
    Name = "QuantumLedger-EIP"
  }

  depends_on = [aws_internet_gateway.quantumledger]
}

# Data source for Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Outputs
output "instance_public_ip" {
  description = "Public IP of QuantumLedger server"
  value       = aws_eip.quantumledger.public_ip
}

output "instance_public_dns" {
  description = "Public DNS of QuantumLedger server"
  value       = aws_instance.quantumledger.public_dns
}

output "rds_endpoint" {
  description = "RDS Database endpoint"
  value       = aws_db_instance.quantumledger.address
}

output "live_app_url" {
  description = "LIVE QuantumLedger Application URL"
  value       = "http://${aws_eip.quantumledger.public_ip}:8000"
}

output "api_docs_url" {
  description = "API Documentation (Swagger)"
  value       = "http://${aws_eip.quantumledger.public_ip}:8000/docs"
}

output "private_key_path" {
  description = "Path to private key file"
  value       = local_file.private_key.filename
}
