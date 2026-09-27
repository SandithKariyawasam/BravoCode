output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "ssm_connection_string" {
  description = "Instructions to connect to instances via SSM"
  value       = "Use AWS Systems Manager (SSM) Session Manager in the AWS Console to securely connect to your instances in the private subnets."
}
