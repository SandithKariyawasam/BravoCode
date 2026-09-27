# terraform/security.tf

# 1. Security Group for the Application Load Balancer
# Allows inbound HTTP/HTTPS from the internet
resource "aws_security_group" "alb_sg" {
  name        = "bravocode-alb-sg"
  description = "Allow HTTP and HTTPS traffic from the internet to the ALB"
  vpc_id      = aws_vpc.main.id

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

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "BravoCode-ALB-SG"
  }
}

# 2. Security Group for the ASG EC2 Instances
# Allows inbound traffic ONLY from the ALB, plus outbound to internet (via NAT)
resource "aws_security_group" "asg_sg" {
  name        = "bravocode-asg-sg"
  description = "Allow traffic from ALB to EC2 instances"
  vpc_id      = aws_vpc.main.id

  # Frontend Port
  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  # Backend Port (if accessed directly via ALB routing rules later)
  ingress {
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  # Allow all outbound traffic (so instances can download Docker images via NAT Gateway)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "BravoCode-ASG-SG"
  }
}
