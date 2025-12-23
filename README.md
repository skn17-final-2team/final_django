# FINAL_DJANGO (SKN 17기 Final Project 2Team)

## 프로젝트 개요

### 프로젝트 명
말하는대로 (AI 기반 회의 자동화 시스템)

### 프로젝트 소개
음성에서 문서로. **실시간 녹음/업로드 → STT/화자 분리 → 도메인 기반 분석 → 안건/태스크 추출 → 캘린더 연동 → 웹 기반 회의록 생성**까지 **5단계 자동화**를 제공하는 회의 지원 솔루션입니다.

본 레포지토리는 **Django 기반 웹 애플리케이션**만을 포함합니다.

- 모델 서버 레포지토리: https://github.com/skn17-final-2team/final_runpod_server

## 핵심 기능
| 구분 | 기능 | 설명 |
|:--|:--|:--|
| 입력 | 실시간 녹음 / 파일 업로드 | 회의 중 녹음 또는 기존 음성 파일 업로드 |
| 연동 | 구글 캘린더 연동 | 추출된 태스크를 캘린더 일정으로 등록 |
| 출력 | 웹 기반 회의록 생성 | 표준 템플릿 문서로 회의록을 생성/조회 |

## 기술 스택

### 🖥️ Frontend
| 분야 | 기술 |
|:--|:--|
| UI 구성 | ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=HTML5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=CSS3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=JavaScript&logoColor=black) |

### ⚙️ Backend
| 분야 | 기술 |
|:--|:--|
| 웹 프레임워크 | ![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=Django&logoColor=white) |
| 서버 실행 | ![Gunicorn](https://img.shields.io/badge/Gunicorn-499848?style=for-the-badge&logo=Gunicorn&logoColor=white) ![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white) |
| 데이터베이스 | ![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white) |

## .env

프로젝트 루트에 `.env` 파일을 생성하고 아래 값을 설정합니다.

```env
# Django
DJANGO_SECRET_KEY=

# Database
DATABASES_PASSWORD=
DATABASES_HOST=

# Deploy / Domain
AWS_ELASTIC_IP=<EC2 고정 IP>
DOMAIN_URL=<HTTPS 배포시 배포 URL>

# AWS S3 (Static/Media 사용 시)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=<S3 버킷 이름>
AWS_S3_REGION_NAME=ap-northeast-2

# Model Server (RunPod)
POD_ID=<모델이 올라간 런팟의 팟 ID>
```

# 배포 가이드

## 1. EC2 SSH 접속
```bash
ssh -i <pem키 경로> ubuntu@<EC2 IP>
```
## 2. 필수 패키지 설치
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release
```
## 3. Docker GPG 키 등록
```bash
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
```
## 4. Docker 공식 저장소 추가
```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```
## 5. Docker & Compose 플러그인 설치
```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```
## 6. Docker 명령어 등록
```bash
sudo usermod -aG docker ubuntu
newgrp docker
```
## 7. git clone
```bash
git clone https://github.com/skn17-final-2team/final_django.git
cd final_django
```
## 8 .env 설정 변경
```
AWS_ELASTIC_IP=<EC2 IP>
POD_ID=<POD ID>
```
## 9. .env 파일 EC2로 옮기기
```bash
scp -i <pem키 경로> <.env 경로> ubuntu@[EC2 IP]:/home/ubuntu/final_django
```
## 10. settings DEBUG = False 주석 풀기
```bash
vim final_django/settings.py
```
## 11. Docker 빌드 및  실행
```bash
docker compose build --no-cache
docker compose up -d
```
## 12. Docker 중지
```bash
docker compose down
```