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

# Fetch the latest Ubuntu 22.04 AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Default VPC
data "aws_vpc" "default" {
  default = true
}

# Security Group to allow necessary ports
resource "aws_security_group" "bravocode_sg" {
  name        = "bravocode-sg"
  description = "Allow HTTP, SSH, and App ports for BravoCode"
  vpc_id      = data.aws_vpc.default.id

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP (Frontend - if served on 80)
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Backend API Port
  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Frontend Dev Port (Vite)
  ingress {
    from_port   = 5173
    to_port     = 5173
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
    Name = "BravoCode-SG"
  }
}

# Create an SSH key pair (you can provide your existing public key in variables)
resource "aws_key_pair" "deployer" {
  key_name   = "bravocode-deploy-key"
  public_key = var.public_key
}

# The EC2 Instance
resource "aws_instance" "bravocode_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.deployer.key_name
  vpc_security_group_ids = [aws_security_group.bravocode_sg.id]

  # User data script to install Docker and start the container
  user_data = <<-EOF
              #!/bin/bash
              set -ex
              
              # Update package list
              apt-get update -y
              
              # Install Docker
              apt-get install -y apt-transport-https ca-certificates curl software-properties-common git
              curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
              add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
              apt-get update -y
              apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
              
              # Start and enable Docker
              systemctl start docker
              systemctl enable docker
              
              # Optionally, pull the repo and build the image here
              # (Assuming the repo is public or you have deployment keys set up)
              # git clone https://github.com/SandithKariyawasam/BravoCode.git /home/ubuntu/BravoCode
              # cd /home/ubuntu/BravoCode
              # docker compose up -d --build
              
              echo "EC2 provisioned with Docker successfully!"
              EOF

  tags = {
    Name = "BravoCode-EC2"
  }
}
