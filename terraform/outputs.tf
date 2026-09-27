output "instance_public_ip" {
  description = "The public IP address of the EC2 instance"
  value       = aws_instance.bravocode_server.public_ip
}

output "ssh_connection_string" {
  description = "Command to SSH into the server"
  value       = "ssh -i <your-private-key-file> ubuntu@${aws_instance.bravocode_server.public_ip}"
}

output "backend_url" {
  description = "URL for the Node.js backend"
  value       = "http://${aws_instance.bravocode_server.public_ip}:5000"
}
