sm.pp = {}

var test = "<html><head><script src='penis'></script></head><p onload='hack()' class='sm-tag'>Hello world</p><img src='llol.jpg' onerror='hack()'></html>"


/*
  To-do:
    - Strip malicious elements
    - Strip all conflicting style tags
    - Strip all on* things
*/


var allowedElements = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "div",
  "span",
  "section",
  "a",
  "ul",
  "li",
  "table",
  "td",
  "tr",
  "th",
  "tbody",
  "img",
  "thead"
]

sm.pp.stripElements = function(data) {
  for (var i=data.length -1; i>=0; i--) {
    if (allowedElements.indexOf(data[i].nodeName.toLowerCase()) == -1) {
      data.splice(i, 1)
    }
  }

  return data
}

sm.pp.stripClassesEvents = function(data) {
  for (var i=0; i<data.length; i++) {
    for (var k=data[i].classList.length -1; k>=0; k--) {
      if (data[i].classList[k].substr(0, 3) == "sm-") {
        data[i].classList[k] = null
      }
    }

    for (var k=data[i].attributes.length -1; k>=0; k--) {
      if (data[i].attributes[k].nodeName.substr(0, 2) == "on") {
        data[i].attributes[k] = null
      }
    }
  }

  return data
}

sm.pp.processHTML = function(data) {
  data = $.parseHTML(data)

  console.log(data);
  data = sm.pp.stripElements(data)
  data = sm.pp.stripClassesEvents(data)

  console.log(data)
}
