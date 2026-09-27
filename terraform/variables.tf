variable "aws_region" {
  description = "The AWS region to deploy in"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 Instance type (t3.medium recommended for running multiple compilers)"
  type        = string
  default     = "t3.medium"
}

variable "public_key" {
  description = "Your public SSH key to access the EC2 instance (e.g. ssh-rsa AAAAB3...)"
  type        = string
}
