function getStyle(element) {
  if (!element.style)
    element.style = {};

  for (let prop in element.computedStyle) {
    element.style[prop] = element.computedStyle[prop].value;

    if (element.style[prop].toString().match(/px$/)) {
      element.style[prop] = parseInt(element.style[prop]);
    }

    if (element.style[prop].toString().match(/^[0-9\.]+$/)) {
      element.style[prop] = parseInt(element.style[prop]);
    }
  }
  return element.style;
}

function layout(element) {
  //★★★start 预处理
  if (!element.computedStyle) return;

  const elementStyle = getStyle(element);

  if (elementStyle.display !== 'flex') return;

  const items = element.children.filter(e => e.type === 'element');//?? 文本节点不占空间

  items.sort(function(a, b) { //order大的，在前？？
    return (a.order || 0) - (b.order || 0);
  });

  const style = elementStyle


      ['width', 'height'].forEach(size => {
    if (style[size] === 'auto' || style[size] === '') {
      style[size] = null;
    }
  });

  if (!style.flexDirection || style.flexDirection === 'auto') {
    style.flexDirection = 'row';
  }

  if (!style.alignItems || style.alignItems === 'auto') {
    style.alignItems = 'stretch';// cross对齐方式
  }
  if (!style.justifyContent || style.justifyContent === 'auto') {
    style.justifyContent = 'flex-start'; // 主方向对齐方式
  }
  if (!style.flexWrap || style.flexWrap === 'auto') {
    style.flexWrap = 'nowrap';
  }
  if (!style.alignContent || style.alignContent === 'auto') {
    style.alignContent = 'stretch';// cross对齐方式
  }

  let mainSize, mainStart, mainEnd, mainSign, mainBase,
      crossSize, crossStart, crossEnd, crossSign, crossBase;

  if (style.flexDirection === 'row') {
    mainSize = 'width';
    mainStart = 'left';
    mainEnd = 'right';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';

  }
  if (style.flexDirection === 'row-reverse') {
    mainSize = 'width';
    mainStart = 'right';
    mainEnd = 'left';
    mainSign = -1;
    mainBase = style.width;

    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';
  }

  if (style.flexDirection === 'column') {
    mainSize = 'height';
    mainStart = 'top';
    mainEnd = 'bottom';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';

  }

  if (style.flexDirection === 'column-reverse') {
    mainSize = 'height';
    mainStart = 'bottom';
    mainEnd = 'top';
    mainSign = -1;
    mainBase = style.height;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';
  }

  if (style.flexWrap === 'wrap-reverse') {// 以行为单位反向
    const tmp = crossStart;
    crossStart = crossEnd;
    crossEnd = tmp;
    crossSign = -1;
  } else {
    crossSign = +1;//??
    crossBase = 0;//??

  }

  let isAutoMainSize = false;
  if (!style[mainSize]) {// 父元素没有设置主轴尺寸
    elementStyle[mainSize] = 0;
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      const itemStyle = getStyle(item);
      if (itemStyle[mainSize] !== null || itemStyle[mainSize] !== (void 0)) {
        elementStyle[mainSize] += itemStyle[mainSize];
      }
    }
    isAutoMainSize = true;
  }
  //★★★end 预处理
  //★★★start 確定flexLines、mainSpace、crossSpace
  // - 即为子元素确定所在行，为每行确定其子元素占用的宽度和高度
  //★★★ 要区分情况：子元素是否伸缩、是否换行排版
  let flexLine = [];
  const flexLines = [flexLine];

  let mainSpace = elementStyle[mainSize];
  let crossSpace = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemStyle = getStyle(item);

    if (itemStyle[mainSize] === null) {
      itemStyle[mainSize] = 0;
    }
    // 情况：子元素可伸缩
    if (itemStyle.flex) {
      flexLine.push(item);

      // 情况：子元素不可伸缩
      // 情况：不换行排版
      // 情况：父元素宽度由子元素撑开
    } else if (style.flexWrap === 'nowrap' && isAutoMainSize) {
      mainSpace -= itemStyle[mainSize];

      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
      }
      flexLine.push(item);

      // 情况：子元素不可伸缩
      // 情况：换行排版
    } else {
      if (itemStyle[mainSize] > style[mainSize]) {
        // 子元素宽度大于父元素宽度，子元素预处理成父元素的宽度
        itemStyle[mainSize] = style[mainSize];
      }

      // 子元素放不下这行
      if (mainSpace < itemStyle[mainSize]) {
        flexLine.mainSpace = mainSpace; // 剩余空间
        flexLine.crossSpace = crossSpace;

        flexLine = [item];
        flexLines.push(flexLine);
        mainSpace = style[mainSize];
        crossSpace = 0;

        mainSpace -= itemStyle[mainSize];

        if (itemStyle[crossSize] !== null && itemStyle[crossSize] !==
            (void 0)) {
          crossSpace = Math.max(crossSpace, itemStyle[crossSize]);

        }
        // 子元素放得下这行
      } else {
        flexLines.push(flexLine);

        mainSpace -= itemStyle[mainSize];

        if (itemStyle[crossSize] !== null && itemStyle[crossSize] !==
            (void 0)) {
          crossSpace = Math.max(crossSpace, itemStyle[crossSize]);

        }
      }

    }
  }
  flexLine.mainSpace = mainSpace;


  if (style.flexWrap === 'nowrap' || isAutoMainSize) {
    flexLine.crossSpace = (style[crossSize] !== undefined) ?
        style[crossSize] :
        crossSpace;
  } else {
    flexLine.crossSpace = crossSpace;
  }


  //★★★end 確定flexLines、mainSpace、crossSpace
  //★★★start 確定每个子元素的mainSize、mainStart、mainEnd
  // - 需要区分行空间是否占满、是否有flex元素
  // 情况：行被子元素占得没有剩余空间 ?> 子元素收缩自己的宽度
  if (mainSpace < 0) {
    const scale = style[mainSize] / (style[mainSize] - mainSpace);
    let currentMain = mainBase;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemStyle = getStyle(item);

      if (itemStyle.flex) {// 则flex元素宽度为0
        itemStyle[mainSize] = 0;
      }

      // 普通元素按比例压缩自己的宽度
      itemStyle[mainSize] = itemStyle[mainSize] * scale;

      itemStyle[mainStart] = currentMain;
      itemStyle[mainEnd] = itemStyle[mainStart] + mainSign *
          itemStyle[mainSize];
      currentMain = itemStyle[mainEnd];
    }

    // 情况：行有剩余空间 ?> flex元素占满剩余空间 || 普通元素空开排版
  } else {
    flexLines.forEach(function(flexLine) {
      const mainSpace = flexLine.mainSpace;

      let flexTotal = 0; // 分母

      for (let i = 0; i < flexLine.length; i++) {
        const item = items[i];
        const itemStyle = getStyle(item);

        if ((itemStyle.flex !== null) && (itemStyle.flex !== (void 0))) {
          flexTotal += itemStyle.flex;
          // continue
        }
      }

      // 有flex元素
      if (flexTotal > 0) {
        let currentMain = mainBase;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemStyle = getStyle(item);

          if (itemStyle.flex) {
            itemStyle[mainSize] = (mainSpace / flexTotal) * itemStyle.flex;
          }
          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] = itemStyle[mainStart] + mainSign *
              itemStyle[mainSize];

          currentMain = itemStyle[mainEnd];
        }

        // 没有flex元素
      } else {
        let currentMain;
        let step;//  空隙宽度
        // 当有剩余空间但没有flex元素，justifyContent开始发挥作用
        if (style.justifyContent === 'flex-start') {
          currentMain = mainBase;
          step = 0;
        }
        if (style.justifyContent === 'flex-end') {
          currentMain = mainSpace * mainSign + mainBase;
          step = 0;
        }

        if (style.justifyContent === 'center') {
          currentMain = mainSpace / 2 * mainSign + mainBase;
          step = 0;
        }

        if (style.justifyContent === 'space-between') {
          step = mainSpace / (items.length - 1) * mainSign;
          currentMain = mainBase;

        }

        if (style.justifyContent === 'space-around') {
          //?? step如何定义
          step = mainSpace / (items.length) * mainSign;
          currentMain = step / 2 + mainBase;
        }
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemStyle = getStyle(item);

          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
          currentMain = itemStyle[mainEnd] + step

        }
      }

    });
  }
}

module.exports = layout;


































