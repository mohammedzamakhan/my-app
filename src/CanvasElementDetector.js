import React, { useState, useEffect, useRef } from "react";

function CanvasElementDetector() {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [selectedElements, setSelectedElements] = useState([]);

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;

        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);
      }
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // Clear the canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw guide lines and measurements for selected elements
        if (selectedElements.length > 0) {
          drawGuideLines(ctx, selectedElements);
          drawMeasurements(ctx, selectedElements);
        }

        // Draw Figma-style boxes for selected elements
        drawFigmaStyleBoxes(ctx, selectedElements);

        // Draw box model for hovered element
        if (hoveredElement) {
          drawBoxModel(ctx, hoveredElement.element);
        }

        // Draw box model for all flexbox and grid examples
        const flexboxElements = document.querySelectorAll(
          ".flex-row-container, .flex-column-container, .flex-wrap-container, .flex-item, .flex-wrap-item, .flex-wrap-container-partial, .flex-nested, .flex-complex-align, .flex-order, .flex-grow-shrink, .flex-wrap-align"
        );
        const gridElements = document.querySelectorAll(
          ".grid-container-2, .grid-container-3, .grid-item, .grid-container-span, .grid-dense, .grid-overlap, .grid-complex, .grid-autofit, .grid-mixed-units"
        );

        [...flexboxElements, ...gridElements].forEach((element) => {
          // drawBoxModel(ctx, element);
        });
      }
    }
  }, [selectedElements, hoveredElement]);

  const drawGuideLines = (ctx, elements) => {
    ctx.strokeStyle = "rgba(139, 0, 0, 1)"; // dark red
    ctx.setLineDash([2, 2]); // Dashed line
    ctx.lineWidth = 1;

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(0, Math.floor(rect.top) + 0.5);
      ctx.lineTo(ctx.canvas.width, Math.floor(rect.top) + 0.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, Math.floor(rect.bottom) + 0.5);
      ctx.lineTo(ctx.canvas.width, Math.floor(rect.bottom) + 0.5);
      ctx.stroke();

      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(Math.floor(rect.left) + 0.5, 0);
      ctx.lineTo(Math.floor(rect.left) + 0.5, ctx.canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(Math.floor(rect.right) + 0.5, 0);
      ctx.lineTo(Math.floor(rect.right) + 0.5, ctx.canvas.height);
      ctx.stroke();
    });

    ctx.setLineDash([]); // Reset line dash
  };

  const drawMeasurements = (ctx, elements) => {
    // Sort elements by their position (top to bottom, left to right)
    elements.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      if (rectA.top !== rectB.top) return rectA.top - rectB.top;
      return rectA.left - rectB.left;
    });
  };

  const drawFigmaStyleBoxes = (ctx, elements) => {
    elements.forEach((element) => {
      if (element.getClientRects) {
        const rects = element.getClientRects();
        for (let i = 0; i < rects.length; i++) {
          drawSingleRect(ctx, rects[i]);
        }
      } else {
        const rect = element.getBoundingClientRect();
        drawSingleRect(ctx, rect);
      }
    });
  };

  const drawSingleRect = (ctx, rect) => {
    // Draw main outline
    ctx.strokeStyle = "#000"; // Figma blue color
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);
    ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);

    // Draw corner handles
    const handleSize = 3; // Smaller handle size
    const corners = [
      { x: rect.left, y: rect.top },
      { x: rect.left + rect.width, y: rect.top },
      { x: rect.left, y: rect.top + rect.height },
      { x: rect.left + rect.width, y: rect.top + rect.height },
    ];

    corners.forEach((corner) => {
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const getFlexItemDimensions = (element) => {
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    const parentStyles = window.getComputedStyle(element.parentElement);
    const parentRect = element.parentElement.getBoundingClientRect();

    let top = rect.top;
    let height = rect.height;

    if (parentStyles.display === 'flex') {
      const alignSelf = styles.alignSelf;
      const flexBasis = styles.flexBasis;
      const alignItems = parentStyles.alignItems;
      
      if (flexBasis !== 'auto' && flexBasis !== '0') {
        height = parseFloat(flexBasis);
      }

      switch (alignSelf !== 'auto' ? alignSelf : alignItems) {
        case 'flex-start':
          top = parentRect.top + parseFloat(styles.marginTop);
          break;
        case 'flex-end':
          top = parentRect.bottom - height - parseFloat(styles.marginBottom);
          break;
        case 'center':
          top = parentRect.top + (parentRect.height - height) / 2;
          break;
        case 'stretch':
          height = parentRect.height - parseFloat(styles.marginTop) - parseFloat(styles.marginBottom);
          top = parentRect.top + parseFloat(styles.marginTop);
          break;
        default: // 'auto' or inherited
          if (alignItems === 'stretch') {
            height = parentRect.height - parseFloat(styles.marginTop) - parseFloat(styles.marginBottom);
            top = parentRect.top + parseFloat(styles.marginTop);
          }
          break;
      }
    }

    return { top, height };
  };

  const drawBoxModel = (ctx, element) => {
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);

    const margin = {
      top: parseInt(styles.marginTop),
      right: parseInt(styles.marginRight),
      bottom: parseInt(styles.marginBottom),
      left: parseInt(styles.marginLeft),
    };

    const border = {
      top: parseInt(styles.borderTopWidth),
      right: parseInt(styles.borderRightWidth),
      bottom: parseInt(styles.borderBottomWidth),
      left: parseInt(styles.borderLeftWidth),
    };

    const padding = {
      top: parseInt(styles.paddingTop),
      right: parseInt(styles.paddingRight),
      bottom: parseInt(styles.paddingBottom),
      left: parseInt(styles.paddingLeft),
    };

    // Draw margin
    ctx.fillStyle = "rgba(255, 165, 0, 0.5)"; // Orange
    ctx.fillRect(
      rect.left - margin.left,
      rect.top - margin.top,
      rect.width + margin.left + margin.right,
      margin.top
    ); // Top
    ctx.fillRect(rect.right, rect.top, margin.right, rect.height); // Right
    ctx.fillRect(
      rect.left - margin.left,
      rect.bottom,
      rect.width + margin.left + margin.right,
      margin.bottom
    ); // Bottom
    ctx.fillRect(rect.left - margin.left, rect.top, margin.left, rect.height); // Left

    // Draw border
    ctx.fillStyle = "rgba(0, 128, 0, 0.5)"; // Green
    ctx.fillRect(
      rect.left - border.left,
      rect.top - border.top,
      rect.width + border.left + border.right,
      border.top
    ); // Top
    ctx.fillRect(rect.right, rect.top, border.right, rect.height); // Right
    ctx.fillRect(
      rect.left - border.left,
      rect.bottom,
      rect.width + border.left + border.right,
      border.bottom
    ); // Bottom
    ctx.fillRect(rect.left - border.left, rect.top, border.left, rect.height); // Left

    // Draw padding
    ctx.fillStyle = "rgba(144, 238, 144, 0.5)"; // Light green
    ctx.fillRect(rect.left, rect.top, rect.width, padding.top); // Top
    ctx.fillRect(
      rect.right - padding.right,
      rect.top + padding.top,
      padding.right,
      rect.height - padding.top - padding.bottom
    ); // Right
    ctx.fillRect(
      rect.left,
      rect.bottom - padding.bottom,
      rect.width,
      padding.bottom
    ); // Bottom
    ctx.fillRect(
      rect.left,
      rect.top + padding.top,
      padding.left,
      rect.height - padding.top - padding.bottom
    ); // Left

    // Draw content
    ctx.fillStyle = "rgba(173, 216, 230, 0.5)"; // Light blue
    
    const { top: contentTop, height: contentHeight } = getFlexItemDimensions(element);
    
    ctx.fillRect(
      rect.left + border.left + padding.left,
      contentTop + border.top + padding.top,
      rect.width - border.left - border.right - padding.left - padding.right,
      contentHeight - border.top - border.bottom - padding.top - padding.bottom
    );

    if (
      element.children.length > 0 &&
      (styles.display === "flex" || styles.display === "grid")
    ) {
      const childRects = Array.from(element.children).map((child) => ({
        rect: child.getBoundingClientRect(),
        order: parseInt(window.getComputedStyle(child).order) || 0,
      }));
      const parentRect = element.getBoundingClientRect();

      const minGap = 1; // Minimum gap size to draw (in pixels)

      if (styles.display === "flex") {
        drawFlexboxGaps(ctx, childRects, parentRect, styles, minGap);
      } else if (styles.display === "grid") {
        drawGridGaps(ctx, element, styles, minGap);
      }
    }
  };

  const drawFlexboxGaps = (ctx, childRects, parentRect, styles, minGap) => {
    const isRow = styles.flexDirection.includes("row");
    const isWrap = styles.flexWrap === "wrap";

    // Sort child rects by their visual order
    childRects.sort((a, b) => a.order - b.order);

    const drawFlexGap = (x, y, width, height, isDarker = false) => {
      ctx.fillStyle = "rgba(128, 0, 128, 0.3)";
      ctx.fillRect(x, y, width, height);
      drawDottedPattern(ctx, x, x + width, y, y + height, false);
    };

    const groupIntoLines = (rects, isRow) => {
      const lines = [];
      let currentLine = [];
      let currentEdge = isRow ? rects[0].rect.top : rects[0].rect.left;

      rects.forEach((rect) => {
        const edge = isRow ? rect.rect.top : rect.rect.left;
        if (Math.abs(edge - currentEdge) > 1) {
          lines.push(currentLine);
          currentLine = [];
          currentEdge = edge;
        }
        currentLine.push(rect);
      });
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      return lines;
    };

    if (isWrap) {
      // Draw gaps between wrapped lines (darker)
      const lines = groupIntoLines(childRects, isRow);
      lines.forEach((line, index) => {
        if (index < lines.length - 1) {
          const start = Math.max(
            ...line.map((r) => (isRow ? r.rect.bottom : r.rect.right))
          );
          const end = Math.min(
            ...lines[index + 1].map((r) => (isRow ? r.rect.top : r.rect.left))
          );
          if (end - start >= minGap) {
            drawFlexGap(
              isRow ? parentRect.left : start,
              isRow ? start : parentRect.top,
              isRow ? parentRect.width : end - start,
              isRow ? end - start : parentRect.height,
              true
            );
          }
        }
      });
    }

    // Draw gaps between items in each line (lighter)
    for (let i = 0; i < childRects.length - 1; i++) {
      const currentRect = childRects[i].rect;
      const nextRect = childRects[i + 1].rect;
      let gap, gapStart, gapEnd;

      if (isRow) {
        gap = nextRect.left - currentRect.right;
        gapStart = Math.min(currentRect.top, nextRect.top);
        gapEnd = Math.max(currentRect.bottom, nextRect.bottom);
      } else {
        gap = nextRect.top - currentRect.bottom;
        gapStart = Math.min(currentRect.left, nextRect.left);
        gapEnd = Math.max(currentRect.right, nextRect.right);
      }

      if (gap >= minGap) {
        drawFlexGap(
          isRow ? currentRect.right : gapStart,
          isRow ? gapStart : currentRect.bottom,
          isRow ? gap : gapEnd - gapStart,
          isRow ? gapEnd - gapStart : gap,
          false
        );
      }
    }

    // Draw gap after the last item if it doesn't reach the end
    const lastRect = childRects[childRects.length - 1].rect;
    let endGap, gapStart, gapEnd;

    if (isRow) {
      endGap = parentRect.right - lastRect.right;
      gapStart = lastRect.top;
      gapEnd = lastRect.bottom;
    } else {
      endGap = parentRect.bottom - lastRect.bottom;
      gapStart = lastRect.left;
      gapEnd = lastRect.right;
    }

    if (endGap >= minGap) {
      drawFlexGap(
        isRow ? lastRect.right : gapStart,
        isRow ? gapStart : lastRect.bottom,
        isRow ? endGap : gapEnd - gapStart,
        isRow ? gapEnd - gapStart : endGap,
        false
      );
    }
  };

  const drawGridGaps = (ctx, element, styles, minGap) => {
    const computedStyle = window.getComputedStyle(element);
    const parentRect = element.getBoundingClientRect();

    // Get the actual computed grid tracks
    const columnTracks = computedStyle.gridTemplateColumns.split(" ");
    const rowTracks = computedStyle.gridTemplateRows.split(" ");
    const columnGap = parseFloat(computedStyle.columnGap) || 0;
    const rowGap = parseFloat(computedStyle.rowGap) || 0;

    // Calculate track positions
    const getTrackPositions = (tracks, gap, start) => {
      let positions = [start];
      let currentPosition = start;
      tracks.forEach((track, index) => {
        currentPosition += parseFloat(track);
        if (index < tracks.length - 1) {
          positions.push(currentPosition);
          currentPosition += gap;
          positions.push(currentPosition);
        }
      });
      positions.push(currentPosition);
      return positions;
    };

    const columnPositions = getTrackPositions(
      columnTracks,
      columnGap,
      parentRect.left
    );
    const rowPositions = getTrackPositions(rowTracks, rowGap, parentRect.top);

    // Draw column gaps
    for (let i = 1; i < columnPositions.length - 1; i += 2) {
      const startX = columnPositions[i];
      const endX = columnPositions[i + 1];
      if (endX - startX >= minGap) {
        drawGapRectangle(
          ctx,
          startX,
          parentRect.top,
          endX - startX,
          parentRect.height
        );
      }
    }

    // Draw row gaps
    for (let i = 1; i < rowPositions.length - 1; i += 2) {
      const startY = rowPositions[i];
      const endY = rowPositions[i + 1];
      if (endY - startY >= minGap) {
        drawGapRectangle(
          ctx,
          parentRect.left,
          startY,
          parentRect.width,
          endY - startY
        );
      }
    }
  };

  const drawGapRectangle = (ctx, x, y, width, height) => {
    // Darker purple for grid, lighter for flexbox
    ctx.fillStyle = "rgba(128, 0, 128, 0.3)";
    ctx.fillRect(x, y, width, height);
    drawDottedPattern(ctx, x, x + width, y, y + height);
  };

  const drawDottedPattern = (ctx, startX, endX, startY, endY) => {
    ctx.fillStyle = "black";
    const dotSize = 1;
    const dotSpacing = 3;

    for (let x = startX; x < endX; x += dotSpacing) {
      for (let y = startY; y < endY; y += dotSpacing) {
        ctx.fillRect(x, y, dotSize, dotSize);
      }
    }
  };

  const handleMouseMove = (e) => {
    const overlay = overlayRef.current;
    const canvas = canvasRef.current;

    if (overlay) overlay.style.pointerEvents = "none";
    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    if (overlay) overlay.style.pointerEvents = "auto";

    if (
      targetElement &&
      targetElement !== canvas &&
      targetElement !== overlay
    ) {
      const elementInfo = {
        element: targetElement,
        tagName: targetElement.tagName.toLowerCase(),
        classes: Array.from(targetElement.classList).join(" "),
        position: { x: e.clientX, y: e.clientY },
      };
      setHoveredElement(elementInfo);
    } else {
      setHoveredElement(null);
    }
  };

  const handleClick = (e) => {
    if (hoveredElement) {
      setSelectedElements((prev) => {
        const element = hoveredElement.element;
        const isSelected = prev.includes(element);
        if (isSelected) {
          return prev.filter((el) => el !== element);
        } else {
          return [...prev, element];
        }
      });
    }
  };

  const isFlexItem = (element) => {
    const parentStyles = window.getComputedStyle(element.parentElement);
    return parentStyles.display === 'flex';
  };

  return (
    <>
      {/* Sample content */}
      <div className="content-container">
        <h1 className="main-title">Figma-style Element Detector</h1>
        <p className="description">
          Move your mouse and click to select elements. Select multiple elements
          to see measurements.
        </p>

        {/* Existing button container */}
        <div className="button-container">
          <button
            className="primary-button"
            onClick={() => alert("selectedElements")}
          >
            Button 1
          </button>
          <button className="secondary-button">Button 2</button>
        </div>

        {/* Flexbox Examples */}
        <h2>Flexbox Examples</h2>
        <div className="flex-row-container">
          <div className="flex-item">Flex 1</div>
          <div className="flex-item">Flex 2</div>
          <div className="flex-item">Flex 3</div>
        </div>

        <div className="flex-column-container">
          <div className="flex-item">Column 1</div>
          <div className="flex-item">Column 2</div>
          <div className="flex-item">Column 3</div>
        </div>

        <div className="flex-wrap-container">
          <div className="flex-wrap-item">Wrap 1</div>
          <div className="flex-wrap-item">Wrap 2</div>
          <div className="flex-wrap-item">Wrap 3</div>
          <div className="flex-wrap-item">Wrap 4</div>
          <div className="flex-wrap-item">Wrap 5</div>
        </div>

        {/* New flexbox example where Wrap 5 doesn't take 100% width */}
        <div className="flex-wrap-container-partial">
          <div className="flex-wrap-item">Wrap 1</div>
          <div className="flex-wrap-item">Wrap 2</div>
          <div className="flex-wrap-item">Wrap 3</div>
          <div className="flex-wrap-item">Wrap 4</div>
          <div className="flex-wrap-item-partial">Wrap 5</div>
        </div>

        {/* New Grid examples */}
        <h2>Grid Examples</h2>
        <div className="grid-container-2">
          <div className="grid-item">Grid 1</div>
          <div className="grid-item">Grid 2</div>
          <div className="grid-item">Grid 3</div>
          <div className="grid-item">Grid 4</div>
        </div>

        <div className="grid-container-3">
          <div className="grid-item">A</div>
          <div className="grid-item">B</div>
          <div className="grid-item">C</div>
          <div className="grid-item">D</div>
          <div className="grid-item">E</div>
          <div className="grid-item">F</div>
        </div>

        {/* New grid example with an item spanning multiple columns */}
        <div className="grid-container-span">
          <div className="grid-item">1</div>
          <div className="grid-item">2</div>
          <div className="grid-item span-2">3 (Spans 2 columns)</div>
          <div className="grid-item">4</div>
          <div className="grid-item">5</div>
          <div className="grid-item">6</div>
        </div>

        {/* Existing grid container */}
        <div className="grid-container">
          <div className="grid-box">Box 1</div>
          <div className="grid-box">Box 2</div>
        </div>

        <p className="paragraph">
          This paragraph contains a{" "}
          <span className="highlight-span">
            multi-line span element to demonstrate how our detector handles
            inline elements that wrap across multiple lines.
          </span>{" "}
          The text continues after the span.
        </p>
        {/* New Complex Grid Examples */}
        <h2>Complex Grid Examples</h2>

        {/* Grid with dense packing */}
        <div className="grid-dense">
          <div className="grid-item">1</div>
          <div className="grid-item grid-item-tall">2</div>
          <div className="grid-item">3</div>
          <div className="grid-item">4</div>
          <div className="grid-item">5</div>
          <div className="grid-item grid-item-wide">6</div>
        </div>

        {/* Grid with overlapping items */}
        <div className="grid-overlap">
          <div className="grid-item">1</div>
          <div className="grid-item">2</div>
          <div className="grid-item grid-item-overlap">3</div>
          <div className="grid-item">4</div>
        </div>

        {/* Grid with complex naming and positioning */}
        <div className="grid-complex">
          <div className="grid-item item-header">Header</div>
          <div className="grid-item item-sidebar">Sidebar</div>
          <div className="grid-item item-main">Main Content</div>
          <div className="grid-item item-footer">Footer</div>
        </div>

        {/* Grid with auto-fit and minmax */}
        <div className="grid-autofit">
          <div className="grid-item">1</div>
          <div className="grid-item">2</div>
          <div className="grid-item">3</div>
          <div className="grid-item">4</div>
          <div className="grid-item">5</div>
        </div>

        {/* Grid with mixed units */}
        <div className="grid-mixed-units">
          <div className="grid-item">Fixed px</div>
          <div className="grid-item">Auto</div>
          <div className="grid-item">Fr unit</div>
          <div className="grid-item">% unit</div>
        </div>

        {/* New Complex Flexbox Examples */}
        <h2>Complex Flexbox Examples</h2>

        {/* Flexbox with nested flex containers */}
        <div className="flex-nested">
          <div className="flex-item">1</div>
          <div className="flex-item flex-container-inner">
            <div className="flex-item-inner">2a</div>
            <div className="flex-item-inner">2b</div>
            <div className="flex-item-inner">2c</div>
          </div>
          <div className="flex-item">3</div>
        </div>

        {/* Flexbox with complex alignment */}
        <div className="flex-complex-align">
          <div className="flex-item align-self-start">Start</div>
          <div className="flex-item align-self-center">Center</div>
          <div className="flex-item align-self-end">End</div>
          <div className="flex-item align-self-stretch">Stretch</div>
        </div>

        {/* Flexbox with order property */}
        <div className="flex-order">
          <div className="flex-item order-3">1 (order 3)</div>
          <div className="flex-item order-1">2 (order 1)</div>
          <div className="flex-item order-2">3 (order 2)</div>
        </div>

        {/* Flexbox with flex-grow and flex-shrink */}
        <div className="flex-grow-shrink">
          <div className="flex-item flex-grow-2">Grow 2</div>
          <div className="flex-item flex-grow-1">Grow 1</div>
          <div className="flex-item flex-shrink-2">Shrink 2</div>
          <div className="flex-item flex-shrink-1">Shrink 1</div>
        </div>

        {/* Flexbox with wrapping and alignment */}
        <div className="flex-wrap-align">
          <div className="flex-item">1</div>
          <div className="flex-item">2</div>
          <div className="flex-item">3</div>
          <div className="flex-item">4</div>
          <div className="flex-item">5</div>
        </div>
      </div>

      {/* Overlay with canvas */}
      <div
        ref={overlayRef}
        className="overlay"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        <canvas ref={canvasRef} className="canvas-overlay" />
        {hoveredElement && (
          <div
            className="hover-info"
            style={{
              left: hoveredElement.position.x + 10,
              top: hoveredElement.position.y + 10,
            }}
          >
            <div className="hover-info-tag">{hoveredElement.tagName}</div>
            {hoveredElement.classes && (
              <div className="hover-info-classes">{hoveredElement.classes}</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default CanvasElementDetector;