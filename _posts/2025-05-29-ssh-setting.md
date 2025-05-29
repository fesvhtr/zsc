---
layout: post
title: ssh conifg without pw
excerpt: "Set up ssh connection without password"
modified: 5/29/2025, 06:00:00
tags: [SSH, tutorial]
comments: true
category: blog
---


1. ssh-keygen -t ed25519  
2. Enter  
3. Find pub in Win (C:\Users\username\.ssh\) or Linux (~/.ssh/)
4. cat ~\.ssh\id_ed25519.pub and copy all
5. Go to server: echo 'ssh-ed25519 xxxx xxxx' >> ~/.ssh/authorized_keys
6. (if need) chmod 700 ~/.ssh  
chmod 600 ~/.ssh/authorized_keys
