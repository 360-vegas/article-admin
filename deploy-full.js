// deploy-full.js - 完整部署流程：压缩 -> 上传 -> 解压
import FtpDeploy from 'ftp-deploy';
import { NodeSSH } from 'node-ssh';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const config = {
  ftp: {
    user: 'zhangnanlin',
    password: 'xi830531',
    host: '38.60.230.100',
    port: 21
  },
  ssh: {
    host: '38.60.230.100',
    username: 'root',           // SSH用户名是root
    password: 'mxK8UV*5V7FMueh', // SSH密码
    port: 22
  },
  paths: {
    localDist: path.join(__dirname, 'dist'),
    localZip: path.join(__dirname, 'dist.zip'),
    remoteFtpRoot: '/',  // FTP根目录（实际映射到/www/wwwroot/admin.czo.vn）
    remoteWebRoot: '/www/wwwroot/admin.czo.vn/dist',  // 网站文件目录
    remoteZipPath: '/www/wwwroot/admin.czo.vn/dist.zip'  // 压缩包实际位置
  }
};

// 步骤1: 压缩dist文件夹
async function compressDist() {
  console.log('\n📦 步骤1: 压缩dist文件夹');
  console.log('========================================');

  // 检查dist文件夹
  if (!fs.existsSync(config.paths.localDist)) {
    throw new Error('dist文件夹不存在！请先运行: pnpm run build');
  }

  // 删除旧压缩包
  if (fs.existsSync(config.paths.localZip)) {
    fs.unlinkSync(config.paths.localZip);
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(config.paths.localZip);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const size = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ 压缩完成: dist.zip (${size} MB)`);
      resolve(size);
    });

    archive.on('error', reject);
    archive.pipe(output);

    // 添加文件时显示进度
    let fileCount = 0;
    archive.on('entry', (entry) => {
      if (entry.stats.isFile()) {
        fileCount++;
        if (fileCount % 10 === 0) {
          process.stdout.write(`\r已压缩 ${fileCount} 个文件...`);
        }
      }
    });

    archive.directory(config.paths.localDist, false);
    archive.finalize();
  });
}

// 步骤2: 上传压缩包到FTP
async function uploadZip() {
  console.log('\n\n☁️  步骤2: 上传压缩包到FTP');
  console.log('========================================');

  const ftpDeploy = new FtpDeploy();

  const ftpConfig = {
    ...config.ftp,
    localRoot: __dirname,
    remoteRoot: config.paths.remoteFtpRoot,
    include: ['dist.zip'],
    exclude: ['**/.*'],
    forcePasv: true,
    sftp: false
  };

  // 监听上传进度
  ftpDeploy.on('uploading', (data) => {
    console.log(`正在上传: ${data.filename}`);
  });

  const startTime = Date.now();
  await ftpDeploy.deploy(ftpConfig);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ 上传完成！耗时: ${duration} 秒`);
}

// 步骤3: SSH远程解压
async function remoteUnzip() {
  console.log('\n\n🔧 步骤3: SSH远程解压');
  console.log('========================================');

  const ssh = new NodeSSH();

  try {
    console.log('尝试连接SSH服务器（端口22）...');
    await ssh.connect({
      ...config.ssh,
      readyTimeout: 10000,  // 减少超时时间到10秒
      tryKeyboard: true
    });
    console.log('✅ SSH连接成功');

    const commands = [
      {
        cmd: `mkdir -p ${config.paths.remoteWebRoot}`,
        desc: '确保目标目录存在'
      },
      {
        cmd: `cd ${config.paths.remoteWebRoot} && rm -rf *`,
        desc: '清理旧文件'
      },
      {
        cmd: `cd ${config.paths.remoteWebRoot} && unzip -qo ${config.paths.remoteZipPath}`,
        desc: '解压新版本到/dist/'
      },
      {
        cmd: `ls -la ${config.paths.remoteWebRoot}/ | head -10`,
        desc: '验证解压结果'
      },
      {
        cmd: `rm -f ${config.paths.remoteZipPath}`,
        desc: '删除压缩包'
      }
    ];

    for (const { cmd, desc } of commands) {
      console.log(`执行: ${desc}...`);
      const result = await ssh.execCommand(cmd);

      if (desc === '验证解压结果' && result.stdout) {
        console.log('解压文件列表:');
        console.log(result.stdout);
      }

      if (result.code !== 0 && !desc.includes('清理')) {
        throw new Error(`${desc} 失败: ${result.stderr}`);
      }
      console.log(`✅ ${desc} - 完成`);
    }

    console.log('✅ 远程解压完成');
  } finally {
    ssh.dispose();
  }
}

// 主函数
async function deploy() {
  const startTime = Date.now();

  console.log('========================================');
  console.log('🚀 开始完整部署流程');
  console.log('========================================');
  console.log(`FTP服务器: ${config.ftp.host}`);
  console.log(`远程目录: ${config.paths.remoteWebRoot}`);
  console.log('========================================');

  try {
    // 步骤1: 压缩
    const zipSize = await compressDist();

    // 步骤2: 上传
    await uploadZip();

    // 步骤3: 尝试SSH远程解压
    let sshSuccess = false;
    try {
      await remoteUnzip();
      sshSuccess = true;
    } catch (sshErr) {
      console.log('\n⚠️  SSH连接失败（端口22可能未开放）');
      console.log('这是正常情况，许多服务器不开放SSH端口。');
    }

    if (!sshSuccess) {
      console.log('\n========================================');
      console.log('📋 请手动完成最后一步');
      console.log('========================================');
      console.log('压缩包已成功上传到服务器，现在需要手动解压：');
      console.log('');
      console.log('1. 使用FTP客户端或服务器控制面板登录服务器');
      console.log('2. 执行以下命令（或在控制面板中操作）：');
      console.log('');
      console.log('   mkdir -p /www/wwwroot/admin.czo.vn/dist                          # 确保目录存在');
      console.log('   cd /www/wwwroot/admin.czo.vn/dist && rm -rf *                  # 清理旧文件');
      console.log('   cd /www/wwwroot/admin.czo.vn/dist && unzip -o ../dist.zip      # 解压文件');
      console.log('   rm -f /www/wwwroot/admin.czo.vn/dist.zip                        # 删除压缩包');
      console.log('');
      console.log('3. 或者使用宝塔面板等工具：');
      console.log('   - 进入文件管理器');
      console.log('   - 找到 /www/wwwroot/admin.czo.vn/dist.zip 文件');
      console.log('   - 解压到 /www/wwwroot/admin.czo.vn/dist/ 目录');
      console.log('   - 删除压缩包');
      console.log('========================================');
    }

    // 清理本地压缩包
    if (fs.existsSync(config.paths.localZip)) {
      fs.unlinkSync(config.paths.localZip);
      console.log('\n✅ 已清理本地压缩包');
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n========================================');
    if (sshSuccess) {
      console.log('🎉 部署完全成功！');
      console.log(`总耗时: ${totalTime} 秒`);
      console.log('访问地址: http://admin.czo.vn');
    } else {
      console.log('✅ 上传成功！');
      console.log(`压缩包已上传到服务器（耗时: ${totalTime} 秒）`);
      console.log('⚠️  请按照上述说明手动解压完成部署');
      console.log('完成解压后访问: http://admin.czo.vn');
    }
    console.log('========================================');

  } catch (err) {
    console.error('\n========================================');
    console.error('❌ 部署失败！');
    console.error('错误信息:', err.message || err);
    console.error('========================================');

    // 清理本地压缩包
    if (fs.existsSync(config.paths.localZip)) {
      fs.unlinkSync(config.paths.localZip);
    }

    process.exit(1);
  }
}

// 执行部署
deploy();
