# 넥서스 배포 안내

이 폴더는 `video-pipeline`을 넥서스 서버에 올리기 위한 최소 배포 파일입니다.

## 필요한 값

`nexus.env.example`을 `nexus.env`로 복사한 뒤 아래 값을 채웁니다.

- `NEXUS_HOST`: 넥서스 서버 주소입니다. 현재 기록상 `192.168.0.21`입니다.
- `NEXUS_USER`: SSH 접속 계정입니다. 현재 프로젝트 기록에는 아직 없습니다.
- `NEXUS_APP_DIR`: 서버에서 앱을 둘 위치입니다.
- `NEXUS_PORT_APP`: 웹 화면 포트입니다. 기본값은 `4177`입니다.

## 배포

```powershell
Copy-Item .\deploy\nexus.env.example .\deploy\nexus.env
notepad .\deploy\nexus.env
.\deploy\deploy-nexus.ps1
```

스크립트가 하는 일은 단순합니다.

1. `video-pipeline` 소스만 압축합니다.
2. 넥서스 서버에 폴더를 만듭니다.
3. 압축파일을 올립니다.
4. 서버에서 압축을 풀고 `npm install --omit=dev`를 실행합니다.
5. `systemd` 서비스 파일을 만들고 앱을 실행합니다.

## 서버 확인

```powershell
ssh USER@192.168.0.21 "systemctl status umsh-video-pipeline --no-pager"
```

브라우저에서는 아래 주소로 확인합니다.

```text
http://192.168.0.21:4177
```

방화벽이나 리버스 프록시를 쓰는 서버라면 `4177` 포트를 열거나 도메인 프록시 설정을 추가해야 합니다.

## 고정 외부 주소

현재 넥서스에는 아래 주소로 고정 접속할 수 있게 nginx 프록시를 추가했습니다.

```text
https://nexus.crea-m.com/umsh-video/
```

적용한 nginx location 예시는 `nginx-nexus-location.conf`에 있습니다.

완성도와 속도 테스트 결과는 `nexus-test-report.md`에 기록했습니다.
