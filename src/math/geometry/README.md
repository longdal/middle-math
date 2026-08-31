# Geometry Renderer

도형 문제는 LLM이 SVG 코드를 직접 작성하게 하지 않고 다음 순서로 처리합니다.

1. 문제 조건을 구조화된 JSON으로 생성
2. 조건 검증
3. 검증된 데이터만 SVG Renderer에 전달
4. 렌더링 결과를 학습 화면에 표시

예:

```ts
{
  shape: 'isosceles',
  equalSides: ['AB', 'AC'],
  givenAngles: { B: 65 },
  unknownAngles: ['A']
}
```

Renderer는 `AB = AC`, `B = 65°`를 이용해 실제 기하 관계가 맞는 좌표를 계산해야 합니다.
