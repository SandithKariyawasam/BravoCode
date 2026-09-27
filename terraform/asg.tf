# terraform/asg.tf

# IAM Role for SSM (Systems Manager) so we can securely access private instances without SSH
resource "aws_iam_role" "ssm_role" {
  name = "bravocode_ssm_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = aws_iam_role.ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_profile" {
  name = "bravocode_ssm_profile"
  role = aws_iam_role.ssm_role.name
}

# Launch Template for ASG
resource "aws_launch_template" "bravocode_lt" {
  name_prefix   = "bravocode-lt-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  key_name      = var.public_key != "" ? aws_key_pair.deployer.key_name : null

  iam_instance_profile {
    name = aws_iam_instance_profile.ssm_profile.name
  }

  network_interfaces {
    security_groups = [aws_security_group.asg_sg.id]
  }

  user_data = base64encode(<<-EOF
              #!/bin/bash
              set -ex

              # Update and install Docker
              apt-get update -y
              apt-get install -y apt-transport-https ca-certificates curl software-properties-common git
              curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
              add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
              apt-get update -y
              apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

              systemctl start docker
              systemctl enable docker

              # Clone repo and start containers
              # Since the repo might be private, ideally we'd use a deploy token, but for now we'll assume public or we just run images directly
              # Alternatively, if you push images to GHCR, you can pull them and run docker-compose up directly from a downloaded raw file.
              
              mkdir -p /home/ubuntu/BravoCode
              cd /home/ubuntu/BravoCode
              curl -fsSL -o docker-compose.yml https://raw.githubusercontent.com/SandithKariyawasam/BravoCode/main/docker-compose.yml

              # Log in to GHCR using a token passed via SSM Parameter Store or ENV (For public packages, login is not strictly required!)
              # Note: If your GHCR packages are private, you MUST authenticate here.
              # Assuming images are marked PUBLIC on GHCR for this portfolio project.
              
              docker compose up -d

              echo "Instances successfully provisioned via ASG!"
              EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "BravoCode-ASG-Instance"
    }
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "bravocode_asg" {
  name                = "bravocode-asg"
  vpc_zone_identifier = [aws_subnet.private_1.id, aws_subnet.private_2.id]
  target_group_arns   = [aws_lb_target_group.frontend_tg.arn]
  
  desired_capacity    = 2
  min_size            = 1
  max_size            = 3

  launch_template {
    id      = aws_launch_template.bravocode_lt.id
    version = "$Latest"
  }

  # Enable Instance Refresh so that when we update the Launch Template or trigger it via CLI, it rolls the instances
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "BravoCode-ASG-Instance"
    propagate_at_launch = true
  }
}
