#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KB_DIR = path.join(__dirname, '.knowledge-base');
const SNAPSHOTS_DIR = path.join(KB_DIR, 'snapshots');

function getGitInfo() {
  try {
    return {
      commitHash: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
      branch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
      message: execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim(),
      author: execSync('git log -1 --pretty=%an <%ae>', { encoding: 'utf8' }).trim()
    };
  } catch {
    return {
      commitHash: 'local',
      branch: 'unknown',
      message: 'Local changes (not committed)',
      author: 'Local user'
    };
  }
}

function getFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function scanDirectory(dir, baseDir = dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (item.isDirectory()) {
      if (!['node_modules', '.git', '.knowledge-base', 'dist', 'build'].includes(item.name)) {
        files.push(...scanDirectory(fullPath, baseDir));
      }
    } else {
      const stat = fs.statSync(fullPath);
      files.push({
        path: relativePath,
        hash: getFileHash(fullPath),
        size: stat.size,
        lastModified: stat.mtime.toISOString()
      });
    }
  }

  return files;
}

function loadScanReport() {
  const reportPath = path.join(__dirname, 'public', 'scan-report.json');
  if (fs.existsSync(reportPath)) {
    return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  }
  return null;
}

function generateSnapshot() {
  const gitInfo = getGitInfo();
  const files = scanDirectory(__dirname);
  const scanReport = loadScanReport();

  const snapshot = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    git: gitInfo,
    codeState: {
      files,
      summary: {
        totalFiles: files.length,
        totalLines: files.reduce((sum, f) => sum + (f.size / 50), 0), // Approx line count
        violationsBySeverity: scanReport?.summary?.bySeverity || {}
      }
    },
    metrics: {
      securityScore: scanReport ? Math.max(0, 100 - scanReport.summary.totalSecurityViolations) : 0,
      dependencyHealth: scanReport ? (100 - scanReport.summary.unusedDependencies * 10) : 0,
      codeQuality: 75 // Default, can enhance later
    },
    scanReport: scanReport || null
  };

  const dateStr = snapshot.timestamp.slice(0, 19).replace(/[:T]/g, '-');
  const fileName = `${dateStr}_${gitInfo.commitHash.slice(0, 8)}.json`;
  const filePath = path.join(SNAPSHOTS_DIR, fileName);

  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
  console.log(`✅ Snapshot created: ${fileName}`);

  return snapshot;
}

// Run
generateSnapshot();
