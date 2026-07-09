import React from 'react';
import { renderToString } from 'react-dom/server';
import { Menu } from '@base-ui/react/menu';

try {
  renderToString(
    React.createElement(Menu.Root, null,
      React.createElement(Menu.Portal, null,
        React.createElement(Menu.Positioner, null,
          React.createElement(Menu.Popup, null,
            React.createElement(Menu.GroupLabel, null, "Test")
          )
        )
      )
    )
  );
  console.log("SUCCESS");
} catch (e) {
  console.log("ERROR:", e.message);
}
