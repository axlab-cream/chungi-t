# 06 · 빌드와 서명

이 PC 에서 실제로 성공한 절차다. 2026-09-10 기준.

## 설치한 것

| 항목 | 버전 | 위치 | 왜 이 위치인가 |
|---|---|---|---|
| Temurin JDK | 21.0.12.1 LTS | `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot` | AGP 8.13 이 JDK 17+ 를 요구한다. 기존에 있던 JDK 8 로는 안 된다 |
| Android SDK | platform 36 / build-tools 36.0.0 / platform-tools 37.0.1 | `D:\Android\sdk` | **C 드라이브 여유가 13.5GB 뿐이다.** D 에 840GB 가 있다 |
| Gradle 캐시 | 8.14.3 (wrapper) | `D:\Android\gradle` | 같은 이유. 기본 위치는 `%USERPROFILE%` 라 C 를 채운다 |

Android Studio IDE 는 설치하지 않았다. 명령줄 도구만으로 빌드가 된다. 에뮬레이터나 GUI 가
필요해지면 그때 추가한다.

## 환경변수 (사용자 범위로 설정됨)

```
JAVA_HOME        = C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot
ANDROID_HOME     = D:\Android\sdk
ANDROID_SDK_ROOT = D:\Android\sdk
GRADLE_USER_HOME = D:\Android\gradle
Path             += %JAVA_HOME%in
```

`android/local.properties` 에 `sdk.dir=D\:\Android\sdk` (Java properties 이스케이프) 를 적었다. 이 파일은 PC 마다
달라 커밋하지 않는다.

## 경로에 한글이 있는 문제

저장소가 `...\천기선생님\...` 아래에 있어 AGP 가 빌드를 거부했다.

```
Your project path contains non-ASCII characters.
This will most likely cause the build to fail on Windows.
```

`android.overridePathCheck=true` 를 `gradle.properties` 에 넣고 **실제로 빌드가 되는지
확인했다. 성공했다.** 우리가 짠 네이티브 코드가 없고 미리 빌드된 AAR 만 쓰기 때문으로 보인다.

다만 이건 AGP 가 권하지 않는 상태다. 나중에 네이티브 코드나 NDK 를 쓰는 의존성이 들어오면
깨질 수 있다. 그때는 ASCII 경로로 저장소를 옮겨야 한다.

## 빌드

```powershell
cd androidpp-shellndroid
.\gradlew.bat assembleDebug      # 디버그 APK
.\gradlew.bat bundleRelease      # Play 업로드용 AAB (키스토어 필요)
```

첫 실행은 Gradle 배포판을 내려받아 4~5분 걸린다.

## 실제 산출물 (2026-09-10)

| 항목 | 값 |
|---|---|
| 결과 | BUILD SUCCESSFUL in 4m 25s (243 tasks) |
| 파일 | `app/build/outputs/apk/debug/app-debug.apk` |
| 크기 | 7.8 MB |
| package | `kr.umsh.app` |
| versionCode / versionName | 1 / 1.0 |
| targetSdk / compileSdk | 36 / 36 |
| application-label | 운명상회 |
| 권한 | INTERNET, BILLING, ACCESS_NETWORK_STATE, DYNAMIC_RECEIVER_NOT_EXPORTED |
| 네이티브 라이브러리 | 없음 |

**이건 디버그 빌드다.** Play 에 올릴 수 없다. 릴리스 AAB 는 업로드 키스토어가 있어야 한다.

## 릴리스 서명 (아직 안 함)

```powershell
cd androidpp-shell
keytool -genkeypair -v -keystore umsh-release.jks -alias umsh `
  -keyalg RSA -keysize 4096 -validity 10000
copy android\keystore.properties.example android\keystore.properties
# keystore.properties 에 비밀번호를 채운다. 이 파일과 .jks 는 커밋되지 않는다.
```

**이 키를 잃으면 같은 앱으로 업데이트를 올릴 수 없다.** Play 앱 서명을 쓰더라도 업로드 키는
따로 보관해야 한다.

`keystore.properties` 가 없으면 `bundleRelease` 도 디버그 키로 서명된다. Play 는 그 산출물을
거부한다. 업로드 전에 파일이 채워졌는지 확인한다.

## AAB 와 APK

Play 에 올리는 것은 **AAB** 다. AAB 는 기기에 직접 설치할 수 없다. 기기 설치용이 필요하면
`bundletool` 로 APKS 를 만들거나 `assembleRelease` 로 APK 를 따로 만든다.
