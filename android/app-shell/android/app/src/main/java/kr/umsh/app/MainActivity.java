package kr.umsh.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends BridgeActivity {

    // AndroidManifest.xml 의 App Links 필터, capacitor.config.ts 의 allowNavigation 과 같은 목록.
    private static final Set<String> APP_HOSTS = new HashSet<>(Arrays.asList("umsh.kr", "www.umsh.kr"));

    // 서버(src/push/fcm.ts)가 FCM data payload 에 넣는 키. 바꾸면 양쪽을 같이 바꾼다.
    private static final String PUSH_PATH_KEY = "umsh_url";
    private static final String PUSH_NOTIFICATION_KEY = "umsh_nid";
    private static final String PUSH_DELIVERY_KEY = "umsh_did";

    /**
     * Android 15(targetSdk 35+) 는 앱을 시스템 바 뒤까지 그리게 강제한다.
     *
     * Capacitor SystemBars 는 페이지에 viewport-fit=cover 가 있으면 여백 처리를 페이지에
     * 맡긴다. umsh.kr 의 공통 크롬(umsh-chrome.js)이 103개 페이지에 viewport-fit=cover 를
     * 붙이지만, 웹은 일반 브라우저 기준이라 상단 여백을 처리하지 않는다. 그래서 검색 화면
     * 등에서 헤더가 상태 표시줄과, 하단 메뉴가 내비게이션 바와 겹쳤다(2026-10-02 실기기).
     *
     * 웹을 앱 때문에 고치지 않도록, 셸이 페이지와 상관없이 항상 시스템 바와 키보드만큼
     * WebView 를 들여 놓는다. 그러면 웹은 모바일 브라우저와 같은 조건에서 그려진다.
     * capacitor.config.ts 의 SystemBars.insetsHandling 을 'disable' 로 두어야 이 처리와
     * 겹치지 않는다.
     */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerBackHandler();
        applySystemBarPadding();
        createDefaultNotificationChannel();
    }

    /**
     * Capacitor 는 앱을 연 주소(intent data)를 저장만 하고 WebView 에는 항상 server.url
     * (https://umsh.kr 홈)을 띄운다. 그래서 App Links 로 돌아온 로그인 콜백
     * (/...?code=...)과 결제 복귀 주소가 버려지고 홈이 열렸다(2026-10-02 실기기).
     *
     * BridgeActivity.load() 가 첫 실행 때도 이 메서드를 부르므로 콜드 스타트와 이미 실행 중인
     * 경우를 모두 여기서 받는다. 우리 도메인의 https 주소만 연다. 첫 실행이면 홈 뒤에 쌓여
     * 뒤로 가기가 홈으로 간다.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (getBridge() == null || intent == null) {
            return;
        }
        if (openPushTarget(intent)) {
            return;
        }
        Uri target = intent.getData();
        if (target == null || !"https".equals(target.getScheme()) || !APP_HOSTS.contains(target.getHost())) {
            return;
        }
        getBridge().getWebView().loadUrl(target.toString());
    }

    /**
     * 푸시 알림을 눌러 들어온 경우. 백그라운드·종료 상태의 알림은 FCM SDK 가 그리고, 누르면
     * 런처 액티비티가 data payload 를 extras 로 받아 열린다(intent data 는 비어 있다).
     * 플러그인은 이미 실행 중일 때만 웹에 이벤트를 넘기고, 콜드 스타트에는 원격 페이지가 아직
     * 리스너를 달기 전이라 웹에서 이동시키면 놓친다. 그래서 셸이 직접 이동한다.
     *
     * 서버의 /api/push/open 을 거쳐 클릭을 기록한 뒤 목적지로 보낸다. 목적지는 서버도 다시
     * 검증하지만, 셸에서도 우리 사이트 안의 경로("/..." 이고 "//" 아님)만 받는다.
     */
    private boolean openPushTarget(Intent intent) {
        Bundle extras = intent.getExtras();
        if (extras == null || !extras.containsKey(PUSH_PATH_KEY)) {
            return false;
        }
        String path = extras.getString(PUSH_PATH_KEY, "");
        String notificationId = extras.getString(PUSH_NOTIFICATION_KEY, "");
        String deliveryId = extras.getString(PUSH_DELIVERY_KEY, "");
        // 액티비티가 다시 만들어질 때 같은 알림으로 또 이동하지 않게 지운다.
        intent.removeExtra(PUSH_PATH_KEY);
        if (!isInternalPath(path)) {
            path = "/";
        }
        Uri open = new Uri.Builder()
            .scheme("https")
            .authority("umsh.kr")
            .path("/api/push/open")
            .appendQueryParameter("n", notificationId)
            .appendQueryParameter("d", deliveryId)
            .appendQueryParameter("to", path)
            .build();
        getBridge().getWebView().loadUrl(open.toString());
        return true;
    }

    static boolean isInternalPath(String path) {
        return path != null
            && path.startsWith("/")
            && !path.startsWith("//")
            && !path.contains("\\")
            && path.length() <= 500;
    }

    /**
     * 기본 알림 채널. Android 8+ 는 채널이 없으면 FCM 이 "기타" 채널로 보내 사용자가 끄기
     * 어렵다. 권한을 받기 전에 만들어 두어도 알림이 뜨지 않으므로 해가 없다.
     */
    private void createDefaultNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
            getString(R.string.default_notification_channel_id),
            getString(R.string.default_notification_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription(getString(R.string.default_notification_channel_description));
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }

    /**
     * @capacitor/app 의 기본 뒤로 가기는 웹 기록이 없으면 아무것도 하지 않는다. 그래서 홈에서
     * 뒤로 가기를 눌러도 앱이 닫히지 않았다(2026-10-02 실기기). 웹이 backButton 리스너를
     * 두지 않으므로 셸이 직접 처리한다: 웹 기록이 있으면 이전 페이지로, 없으면 Android 기본
     * 동작(앱 닫기)으로 넘긴다. capacitor.config.ts 의 App.disableBackButtonHandler 를 true 로
     * 두어 플러그인 처리와 겹치지 않게 한다.
     */
    private void registerBackHandler() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge().getWebView();
                if (webView.canGoBack()) {
                    webView.goBack();
                    return;
                }
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        });
    }

    private void applySystemBarPadding() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            return;
        }

        View container = (View) getBridge().getWebView().getParent();
        int barTypes = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
        ViewCompat.setOnApplyWindowInsetsListener(container, (v, insets) -> {
            Insets bars = insets.getInsets(barTypes);
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));

            // CONSUMED 를 돌려주면 이후 인셋 재계산이 깨진다(Capacitor SystemBars 와 같은 이유).
            // 이미 여백으로 처리한 만큼은 0 으로 넘겨 WebView 가 두 번 들여 놓지 않게 한다.
            return new WindowInsetsCompat.Builder(insets)
                .setInsets(barTypes | WindowInsetsCompat.Type.ime(), Insets.NONE)
                .build();
        });
        ViewCompat.requestApplyInsets(container);
    }
}
