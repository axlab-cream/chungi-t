// Archived landing renderer; retained for restoration, not loaded by the app.
      function renderLanding() {
        if (isLoveThisYearService()) {
          renderLoveThisYearLanding();
          return;
        }
        stage.innerHTML = `
          <article class="sample-story">
            ${storyTopNavMarkup()}
            ${sampleVideoMarkup(landingSampleVideo, "sample-upload-blend")}
            ${sampleIntroMarkup(landingIntroAssets.introBg, "sample-upload-image-blend", "", "")}
            ${sampleSourceSections(
              "고객",
              "직장 운",
              "기운",
              landingSourceAssets.heroCharacter,
              false,
              '<span class="red">사주</span>는 당신을 단정하지 않습니다.<br />지금까지 어떻게 버텨왔는지부터 읽습니다.',
              false,
              landingSourceAssets.worryBg,
              '<p class="landing-worry-copy">겉으로는 괜찮아 보여도<br /><span class="red">말하지 못한 부담</span>이 남아 있습니다.</p>',
              '<p>그동안 지나친 장면들을 모으면,<br />익숙한 <span class="red">반응</span>이 드러납니다.</p>',
              false,
              false,
              landingSourceAssets.palzaBg,
              landingSourceAssets.assetOne,
              false,
              '<p><span class="red">일</span> 때문에 마음이 걸렸군요.<br />잘해야 한다는 압박이 먼저 앞섰는지 살펴보겠습니다.</p>',
              '<h2>먼저 견디고<br />나중에 나를 챙겨온 건 아닌가요?</h2>',
              landingSourceAssets.previewTwo,
              "",
              landingSourceAssets.assetTwo,
              false,
              '<h2>태어날 때부터 가진 성향과 지금의 생활을 나란히 놓으면<br />왜 이 시점에 흔들리는지 보입니다.</h2>',
              landingSourceAssets.manseryeokBg,
              false,
              landingSourceAssets.characterA,
              true,
              '<h2>당신이 잘못한 게 아닙니다.<br /><span class="red">오래 써온 방식</span>이 이제 맞지 않을 수 있습니다.</h2>',
              "top",
              "landing-character-a",
              true,
              false,
              landingSourceAssets.characterC,
              "landing-wealth-transition",
              "source-img",
              "대분석 전환 배경",
              landingSourceAssets.wealthBg,
              false,
              landingSourceAssets.datePreviewOne,
              '<p>지금 마음에 걸린 질문은<br /><span class="red">무엇을 바꾸고 지킬지</span> 알려주는 출발점입니다.</p>',
              landingSourceAssets.characterD,
              '<h2>처음 끌리는 감정과<br /><span class="red">오래 편안한 관계</span>는 다르게 움직입니다.</h2>',
              "",
              landingSourceAssets.romanceCloseup,
              landingSourceAssets.handBells,
              '<p><span class="red">일, 돈, 사람</span>의 이야기를<br />하나로 이어보겠습니다.</p>',
              landingSourceAssets.destinyCardBg,
              '<h2>누구와 있을 때<br /><span class="red">나답게 편안해지는지</span> 보입니다.</h2>',
              landingSourceAssets.characterOutro,
              '<h2>이제 당신의 이야기가<br />왜 같은 곳에서 멈췄는지 읽어보겠습니다.</h2>',
              landingSourceAssets.priceCharacter,
              "",
              false,
              false,
              landingSourceAssets.handReach,
              '<h2>오래된 해석에 머물지 않고<br /><span class="red">지금 당신의 생활</span>까지 함께 읽는<br />나만의 <span class="red">깊은 풀이</span></h2>'
            )}
            <div class="sample-enter">
              <button class="primary-cta" type="button" data-action="enter">내 사주 흐름 확인하기</button>
              <p class="fineprint">생년월일과 지금 마음에 걸린 질문을 바탕으로 풀이를 시작합니다.</p>
            </div>
            ${businessFooterMarkup()}
          </article>
        `;
      }

