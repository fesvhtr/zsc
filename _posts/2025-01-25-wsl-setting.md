---
layout: post
title: WSL configuration for AI Research GPU server / WSL配置AI科研服务器
excerpt: "A step-by-step guide to set up WSL with mirrored or bridged networking mode"
modified: 1/25/2025, 11:00:00
tags: [WSL, tutorial]
comments: true
category: blog
---

This tutorial is a unusual tutorial for special network condition, e.g. same IP problem when bridged mode used in same WIFI / Port problem in mirrored mode when connecting ethernet with cable  
本教程是针对特殊网络条件的特殊教程，例如：多设备在同一WIFI中使用桥接模式时出现的IP相同问题，使用网线连接以太网时出现的镜像模式下的端口问题。

In non-essential cases, it is not recommended to use WSL for the configuration of AI research servers, it is recommended to use a dual system for configuration, the overall configuration process of WSL is very ugly, there are a lot of Windows shit code in this process
在非必要情况下，不建议使用WSL进行AI科研服务器的配置，推荐使用双系统进行配置，WSL整体的配置过程十分抽象，存在大量的Windows屎山代码

## 中文版 Chinese Version
### 环境要求
Windows 11 22h2及以上  
WSL 2.0.0及以上  
Ubuntu自选版本  
推荐使用管理员账户进行配置

### 正常流程
#### GPU设置
在Windows中安装NVIDIA驱动即可，无需安装CUDA和cuDNN，如果Windows可以使用 nvidia-smi 命令查看GPU信息，WSL中也可以使用该命令查看GPU信息  
如果在ssh连接后无法使用nvidia-smi命令，可以配置环境变量，vim ~/.bashrc，添加以下内容
```shell
export PATH=/usr/lib/wsl/lib:$PATH
```

#### 镜像模式（优先测试）
1. 管理员身份打开 _Windows powershell_, 输入 _wsl --install_
2. 应用商店下载 _Ubuntu 22.04 LTS_, 可自选版本
3. 在Windows搜索*启用或关闭Windows功能*, 勾选 _虚拟机平台_ 和 _Windows子系统 for Linux_ 及 _Hyper-V_
4. 重启电脑
5. 在Windows当前用户文件夹（C:\Users\Your Usr）下创建.wslconfig文件，输入以下内容
```shell
[wsl2]  
memory=96GB # 根据自己的内存大小调整  
processors=24 # 根据自己的CPU核心数调整  
[experimental]  
networkingMode=mirrored  
dnsTunneling=true  
firewall=true  
autoProxy=true  
```
6. 第一次启动可以直接点击Ubuntu图标，之后可以在Windows Terminal使用 _wsl_ 命令启动
7. 根据指示设置用户名和密码
8. 输入 _sudo apt update_ 更新软件源，自行使用 _sudo apt install_ 安装所需软件
9. 输入*ifconfig*查看IP地址，应与宿主机一致
10. 使用 _sudo apt install openssh-server_ 安装ssh服务
11. 使用 _sudo service ssh start_ 启动ssh服务
12. 在同一内网的设备上使用ssh连接，输入 _ssh username@ip_ 即可连接
13. 在Windows Terminal使用 _wsl --shutdown_ 关闭WSL
可进一步设置开机自启动，注意若非管理员账户，可能出现多种权限问题，如果允许，可以直接将当前用户加入管理员组  
#### 镜像模型的注意事项
1. 关闭WSL必须使用 _wsl --shutdown_ 命令，直接关闭窗口不会关闭WSL，可以使用 _wsl --list --verbose_ 查看WSL状态

2. 由于宿主机与虚拟机使用相同IP，可能会因为宿主机的网络环境导致虚拟机无法连接内网，可以尝试更改虚拟机的ssh服务端口，并在宿主机的防火墙中添加规则
3. 在设置规则后，可能会因为某些原因无法启动，尤其可能会在重启后出现问题，可以尝试disable规则再enable规则，再次重启WSL后尝试ssh连接
4. 在进行多次尝试后，可能会出现无法连接的情况，请尝试使用桥接模式

#### 桥接模式（次选测试）
1. 确保进行了镜像模式的前4步操作
2. 在Windows搜索栏搜索Hyper-V，打开Hyper-V管理器
3. 打开Hyper-V管理器，点击右侧操作面板中的“虚拟交换机管理器”，在弹出的窗口中，选择“新建虚拟交换机”，然后选择所有的交换机类型
4. 在Windows当前用户文件夹（C:\Users\Your Usr）下创建.wslconfig文件，输入以下内容
```shell
[wsl2]  
networkingMode=bridged  
vmSwitch=WSLBridge # 与虚拟交换机名称一致  
ipv6=true # 可选  
```
5. 重复镜像模式的第6-8步操作
6. 输入*ifconfig*查看IP地址，应与宿主机不同
7. 重复镜像模式的第10-13步操作进行连接

#### 桥接模式的注意事项
1. 由于桥接模式的特性，可能会出现在同一WIFI下的所有设备IP相同，导致互相冲突无法连接。曾尝试两台设备配置不同的ssh端口，但是没能成功解决问题
2. 问题1的解决方法是连接内网中不同的WIFI，IP地址不同，可以正常连接（非常丑陋的解决方法）
3. 由于虚拟网卡的特性，可能会出现大幅降速的问题，打开控制面板\网络和 Internet\网络和共享中心，选择更改适配器设置，找到虚拟网卡，右键属性，找到Large Send Offload Version 2 (IPv4)和Large Send Offload Version 2 (IPv6)，将其关闭，并找到IPv4校验和，将其关闭，重启电脑，可以解决网速问题
4. 网速问题可查询 https://github.com/microsoft/WSL/issues/8171


## English Version
Translated by GPT4, may contain errors
### Environmental Requirements
Windows 11 22h2 or later
WSL 2.0.0 or later
Ubuntu version of your choice
It is recommended to configure using an administrator account.

### Normal Process
#### GPU Configuration
Install the NVIDIA driver in Windows; there is no need to install CUDA or cuDNN. If you can use the nvidia-smi command to check GPU information in Windows, you can also use it in WSL.  
If the nvidia-smi command cannot be used after an SSH connection, configure the environment variable by editing ~/.bashrc with the following:
```shell
export PATH=/usr/lib/wsl/lib:$PATH
```
#### Mirrored Mode (Priority Testing)
1. Open Windows PowerShell as administrator and enter wsl --install.
2. Download Ubuntu 22.04 LTS (or a version of your choice) from the Microsoft Store.
3. Search Turn Windows features on or off in Windows, and check the options Virtual Machine Platform, Windows Subsystem for Linux, and Hyper-V.
4. Restart the computer.
5. Create a .wslconfig file in the current user's folder (C:\Users\Your User) in Windows and enter the following:
```shell
[wsl2]  
memory=96GB # Adjust according to your system memory  
processors=24 # Adjust according to your CPU cores  
[experimental]  
networkingMode=mirrored  
dnsTunneling=true  
firewall=true  
autoProxy=true
```

6. For the first launch, click the Ubuntu icon directly. Later, you can use the wsl command in Windows Terminal to start it.
1. Set the username and password as prompted.
1. Update the software source with sudo apt update. Use sudo apt install to install required software.
1. Check the IP address with ifconfig; it should match the host machine.
1. Install the SSH server with sudo apt install openssh-server.
1. Start the SSH service with sudo service ssh start.
1. Connect from another device in the same network using SSH: enter ssh username@ip.
1. Shut down WSL using wsl --shutdown in Windows Terminal.  
It is possible to set up WSL to start automatically at boot. Note that non-administrator accounts may encounter various permission issues. If permitted, you can add the current user to the administrator group.
#### Notes on Mirrored Mode 
1. Always shut down WSL using the wsl --shutdown command. Closing the window directly will not shut down WSL. Use wsl --list --verbose to check the WSL status.
1. Since the host and virtual machine use the same IP, network connectivity issues may occur due to the host's network environment. You can try changing the SSH server port on the virtual machine and adding rules in the host firewall.
1. If startup issues occur after setting the rules, especially after rebooting, try disabling and re-enabling the rules. Restart WSL and attempt SSH connection again.
1. If repeated attempts fail to establish a connection, try switching to Bridged Mode.

#### Bridged Mode (Secondary Testing)
1. Ensure that you have completed the first four steps of Mirrored Mode.
1. Search for Hyper-V in the Windows search bar and open the Hyper-V Manager.
1. In the Hyper-V Manager, click Virtual Switch Manager in the right-side action panel. In the pop-up window, select Create Virtual Switch, and choose the appropriate switch type.
1. Create a .wslconfig file in the current user's folder (C:\Users\Your User) in Windows and enter the following:
```shell
[wsl2]
networkingMode=bridged  
vmSwitch=WSLBridge # Match the name of the virtual switch  
ipv6=true # Optional  
```
5. Repeat steps 6-8 from Mirrored Mode.
6. Check the IP address with ifconfig; it should differ from the host machine.
7. Repeat steps 10-13 from Mirrored Mode to establish the connection.

#### Notes on Bridged Mode
1. Due to the nature of Bridged Mode, devices connected to the same Wi-Fi may have the same IP, causing conflicts and connection issues. An attempted solution involved configuring different SSH ports on two devices, but it was unsuccessful.
2. To resolve the above issue, connect to different Wi-Fi networks within the same LAN to ensure different IP addresses. (This is a crude workaround.)
3. Significant speed drops may occur due to the virtual network adapter. Open Control Panel\Network and Internet\Network and Sharing Center, select Change adapter settings, find the virtual network adapter, right-click Properties, locate Large Send Offload Version 2 (IPv4) and Large Send Offload Version 2 (IPv6), and disable them. Additionally, find IPv4 Checksum Offload and disable it. Restart the computer to resolve speed issues.
4. For speed issues, refer to https://github.com/microsoft/WSL/issues/8171.