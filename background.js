/*

	------------------------TODO------------------------
	-Might want to swap out chrome.tabs.query for chrome.tabs.getCurrent
	-Add in behaviour for which tab becomes active in parent after CtrlDown
	-retainPosition very glitchy with multipleTab movement
	
*/


/* VARIABLE DECLARATION */
var windowArray 		= []; 
/*
	windowArray.id 			// designated id for that window
	windowArray.ParentId	// if a window was created by detaching a tab from a previous window
							// this is the id of that previous window
*/

var tabArray    		= [];
/*
	tabArray.id
	tabArray.CurrentWindowId
	tabArray.ParentWindowId
	tabArray.OldPosition
*/

var numTabs     		= null
var firstRun    		= true
var ctrlDetachRunning 	= false
var icon2 				= { path: "icon2.png" };
var icon3     			= { path: "icon3.png" };

/* USER PARAMETERS */

// Check for saved settings
chrome.storage.sync.get(null, function(settings) {
	if(settings.isRunning != null)
		isRunning = settings.isRunning
	else
		isRunning = true
	if(settings.skipFirst != null)
		skipFirst = settings.skipFirst
	else
		skipFirst = false
	
	if(settings.chooseChildWindow != null)
		chooseChildWindow = settings.chooseChildWindow
	else 
		chooseChildWindow = false
	
	if(settings.childTabActive != null)
		childTabActive = settings.childTabActive
	else
		childTabActive = false
	
	if(settings.parentTabActive != null)
		parentTabActive = settings.parentTabActive
	else
		parentTabActive = false
	
	if(settings.parentWindowIndex != null)
		parentWindowIndex = settings.parentWindowIndex
	else 
		parentWindowIndex = -1
	
	if(settings.newWindowIndex != null)
		newWindowIndex = settings.newWindowIndex
	else 
		newWindowIndex = -1
	
	if(settings.movementMode != null)
		movementMode = settings.movementMode
	else
		movementMode = 0
	
	if(settings.retainPosition != null)
		retainPosition = settings.retainPosition
	else
		retainPosition = true
})


//var isRunning   		= true	// user option to disable extension
//var skipFirst   		= false // option to skip CtrlUp from moving to first tab, instead going straight to parent
//var chooseChildWindow	= false // for later when user can decide which window to move a tab to
var childTabActive		= false	// defines whether a tab moved using ctrlDown becomes active
var parentTabActive		= false	// defines whether a tab moved using ctrlUp becomes active // not working
//var parentWindowIndex	= -1	// index for tabs moved to previous window: [-1,0] = [lastPosition,firstPosition]
//var newWindowIndex  	= -1 	// index for tabs moved to new window: [-1,0] = [lastPosition,firstPosition]
//var newTabActive    	= false	// whenever a tab moves window, it becomes the active tab
//var movementMode		= 0		// -1,0,1 where -1 is all tabs to left (incl.), 0 is only active, 1 is all to right (incl.)
//var retainPosition  	= false	// tabs remember their immediate parent position and will return to it. Overrules parentWindowIndex


/*
	Returns the index which has a matching id if it exists
	Returns null otherwise
*/
function returnIndex(id, array) {
	for(var i=0; i < array.length; i++) {
		if(array[i].id == id) {
			return i
		}
	}
	return null
}

/*
	Updates settings based on popup
*/
chrome.extension.onMessage.addListener(function(message,sender,sendResponse){
	var icon
	
	switch(message.text) {
		case 'startStop':
			if(isRunning) {
				isRunning = false;
				icon = icon3;
			} else {
				isRunning = true;
				icon = icon2;
			}
			chrome.browserAction.setIcon(icon)
			chrome.storage.sync.set({'isRunning': isRunning})
			break
		// CtrlUp
		case 'parentPosition':
			if(message.value == 0 || message.value == -1)
				parentWindowIndex = message.value
			else 
				throw 'Incorrect parent window index specified'
			chrome.storage.sync.set({'parentPosition': parentPosition})
			break
		case 'retainPosition':
			retainPosition = !retainPosition
			chrome.storage.sync.set({'retainPosition': retainPosition})
			break
		case 'skipFirst':
			skipFirst = !skipFirst
			chrome.storage.sync.set({'skipFirst': skipFirst})
			break
		// Ctrldown
		case 'childPosition':
			if(message.value == 0 || message.value == -1)
				newWindowIndex = message.value
			else 
				throw 'Incorrect child window index specified'
			chrome.storage.sync.set({'childPosition': childPosition})
			break
		case 'movementMode':
			if([-1,0,1].indexOf(message.value) >= 0)
				movementMode = message.value
			else
				throw 'Incorrect movement mode specified'
			chrome.storage.sync.set({'movementMode': movementMode})
			break
		default:
			throw 'Unknown command specified: ' + message.text
	}
});

/*
	Fires whenever a tab is moved, whether by key command or by mouse.
	Has problem of overwriting information for Ctrl+Down
	This function modifies the tab entry for the detached tab if it
	already exists, or creates one if it does not.
*/
chrome.tabs.onDetached.addListener(function(detachedTabId,detachInfo) {
	//console.log('Tab detached: ' + detachedTabId)
	
	chrome.tabs.get(detachedTabId, function(Tab) {
		// search for tab in array
		var i = returnIndex(detachedTabId,tabArray)
		if(i || i == 0) {
			// need to check whether detachment was done by keyboard or not
			if(Tab.windowId == tabArray[i].CurrentWindowId) {
				//console.log('tabArray has already been updated')
				return
			} else {
				//console.log('tabArray has not been updated; updating')
				tabArray[i].CurrentWindowId = Tab.windowId
				tabArray[i].ParentWindowId = detachInfo.oldWindowId
				tabArray[i].OldPosition = detachInfo.oldPosition
			}
		} else {
			// if no entry, then detachment must have been done by mouse
			//console.log('No tabArray entry found; adding')
			tabArray.push({'id':detachedTabId,'ParentWindowId':detachInfo.oldWindowId,
			'CurrentWindowId':Tab.windowId,'OldPosition':detachInfo.oldPosition})
		}
	})
});

/*
	When window is closed, this function identifies its array entry, and
	any windows which cite the closed window as a parent window.
	These windows are updated to have the parent window (if any) of the closed
	window.
	The same is done for any tabs which have this window as a parent.
*/
chrome.windows.onRemoved.addListener(function(RemovedWindowId) {
	//console.log('Window ' + RemovedWindowId + ' closed')
	// Cycle through windows to delete the removed window
	var i = returnIndex(RemovedWindowId, windowArray)
	if(i || i == 0) {
		// Cycle through windows to find any that cite this window as parent
		for(var j=0; j < windowArray.length; j++) {
			
			// Update ParentId for the Child Windows of window being closed
			if(windowArray[j].ParentId == windowArray[i].id) 
				windowArray[j].ParentId = windowArray[i].ParentId
		}
		
		// Find any tabs that have this window as a parent
		for(var j=0; j < tabArray.length; j++) 
			if(tabArray[j].ParentWindowId == RemovedWindowId) {
				// If this window has a parent Id, exchange
				if(windowArray[i].ParentId) {
					tabArray[j].ParentWindowId = windowArray[i].ParentId
				} else {
					tabArray[j].ParentWindowId = null
				}
				// Fixes index-positioning problem for closed middle windows
				tabArray[j].OldPosition = null
			} 
		// Remove window
		//console.log('Removing index ' + i + ' from window array')
		windowArray.splice(i,1)
	} else {
		//console.log("Could not find closed window in array: " + RemovedWindowId)
	}
});

/*
	Creates new array entry for created tabs.
	Searches through window array to find the window this tab
	was created in, and assign the parent window and current window
	in the tab array
*/
chrome.tabs.onCreated.addListener(function(tab) {
	//console.log('Tab ' + tab.id + ' created in window ' + tab.windowId)
	// Want to assign same behaviour as other tabs in the same window
	var i = returnIndex(tab.windowId, windowArray)
	if(i || i == 0) {
		//console.log('	Window found; creating tab entry...')
		tabArray.push({'id':tab.id,
			'ParentWindowId':windowArray[i].ParentId,
			'CurrentWindowId':tab.windowId})
		//console.log('	id: ' + tab.id + ', ParentWindowId: ' + 
		//swindowArray[i].ParentId + ', CurrentWindowId: ' + tab.windowId)
	} else {
		// No window information => add Window to array
		//console.log('	No window found; creating new entry')
		windowArray.push({'id': tab.windowId,'ParentId': null})
		tabArray.push({'id': tab.id,'ParentWindowId': null, 'CurrentWindowId': tab.windowId})
	}
});

/*
	Removes any tab array entry for a tab that is closed
*/
chrome.tabs.onRemoved.addListener(function(TabId) {
	//console.log('Tab closed: ' + TabId)
	var i = returnIndex(TabId,tabArray)
	
	if(i || i == 0) {
		tabArray.splice(i,1)
		//console.log('	Removing from tab array')
	} else {
		//console.log('	No tab array entry found')
	}
});


/*
	Handles incoming commands
*/
chrome.commands.onCommand.addListener(function (command) {
	//console.log('Command ' + command + ' received')
	if(!isRunning) 
		return
	
	// Gets number of open tabs in window => embed function in here to prevent timeout
	chrome.tabs.query({lastFocusedWindow: true}, function (tabs) {
		numTabs = tabs.length;
		
		switch(command) {
			case 'leftTab': 
				if(numTabs > 1) 
					moveLeft(false)
				break
				
			case 'rightTab':
				if(numTabs > 1) 
					moveRight(false)
				break
				
			case 'firstTab':
				moveToParentWindow()
				break
				
			case 'newWindow':			
				// First obtain number of windows
				chrome.windows.getAll(function(windows) { 
					numWindows = windows.length
					moveToChildWindow()
				});
		}
	});
});

/*
	Commands
*/
function moveToParentWindow() {
	chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tab) {
		var ParentId = null
		var GrandParentId = null
		
		// if want CtrlUp to immediately return tab to parent, or tab is currently first
		if(skipFirst || (tab[0].index == 0)) {
			ParentId = getParent(tab[0].id)
			// Get grandparentId: this is necessary as moveToWindow assigns a parent
			for(var i=0; i < windowArray.length; i++)
				if(windowArray[i].id == ParentId) {
					GrandParentId = windowArray[i].ParentId
				}
		} 
		
		// if ParentId found 
		if(ParentId) {
			//console.log('ParentId found')
			// if returning tab to original index
			if(retainPosition) {
				for(var i=0; i < tabArray.length; i++) {
					if(tabArray[i].id == tab[0].id) {
						
						if(tabArray[i].OldPosition == null)
							tabArray[i].OldPosition = parentWindowIndex
						
						moveToWindow(tab[0].id,ParentId,GrandParentId,tabArray[i].OldPosition,null, parentTabActive)
						return
					}
				}
			} else {
				moveToWindow(tab[0].id,ParentId,GrandParentId,parentWindowIndex,null,parentTabActive)
			}
			// no parent =>
		} else if(!skipFirst) {
			console.log('No parent found - moving instead')
			if(tab[0].index == 0) {
				moveRight(true)
			} else {
				moveLeft(true)
			}
		// else no parent to return to, and no movement wanted; do nothing
		} else {
			console.log('No parent and no movement - doing nothing')
		}
	});
}


/*
	Moves the active tab to a new window.
	If only one window currently exists, a new one is created
	Option for user to choose in future which destination window
	Else, cycle through window array seeing if any windows designate
	the current window as a parent. If not => create new window
*/

function moveToChildWindow() {
	chrome.windows.getCurrent({populate:true,windowTypes:['normal']},function(Window) {
		
		var movingTabs = []
		
		// Find active tab
		var i = 0
		for(i; i < Window.tabs.length; i++) {
			if(Window.tabs[i].active)
				break
		}
		
		var activeTab = Window.tabs[i]
		
		// Determine tabs to be moved
		switch(movementMode) {
			// active and all to left
			case -1:
				//console.log('Moving active tab and all to left')
				if(activeTab.index == Window.tabs.length -1)
					return
				for(var i = activeTab.index - 1; i >= 0; i--) {
					//console.log('Adding tab ' + Window.tabs[i].id + ' to movement array')
					movingTabs.push({'id':Window.tabs[i].id,'CurrentIndex':Window.tabs[i].CurrentIndex})
				}
			break
			
			// active only
			case 0:
				//console.log('Moving active tab only')
			break
			
			// active and all to right
			case 1:
				//console.log('Moving active tab and all to right')
				if(activeTab.index == 0)
					return
				for(var i = activeTab.index + 1; i < Window.tabs.length; i++) {
					console.log('Adding tab ' + Window.tabs[i].id + ' to movement array')
					//console.log('adding ' + (Window.tabs.length - (activeTab.index + 1)) + ' to moving array')
					movingTabs.push({'id':Window.tabs[i].id,'CurrentIndex':Window.tabs[i].CurrentIndex})
				}
			break
			
			// throw if anything else
			default:
			//throw // check syntax
		}
		
		// Only one window exists => create new child window
		if(numWindows == 1) {
			// Create new window with current tab and parse current window as parent
			//console.log('	Only one window found; creating new window')
			createWindow(activeTab.id,activeTab.windowId,activeTab.index,movingTabs)
			
		// If user can choose the child window to send a tab to..
		} else if(chooseChildWindow) {
			
			//console.log('	Choose destination chosen - not currently coded')
			
		// Else cycle through windows array, seeing if any have current window as parent
		} else {
			console.log('Multiple windows found; searching child window')
			for(var i=0; i < windowArray.length; i++) {
				if(windowArray[i].ParentId == activeTab.windowId) {
					console.log('Child window found')
					// old!!
					//moveToWindow(activeTab.id, windowArray[i].id, activeTab.windowId, newWindowIndex, activeTab.index, childTabActive)
					//moveToWindow(TABID,TARGETWINDOWID,CURRENTWINDOWID,TARGETINDEX,CURRENTINDEX,MAKEACTIVE)
					console.log('Moving active tab ' + activeTab.id + ' to window ' + windowArray[i].id +
						' from window ' + activeTab.windowId)
					moveToWindow(activeTab.id, windowArray[i].id, Window.id, newWindowIndex, activeTab.index, childTabActive)
					for(var j=0; j < movingTabs.length; j++) {
						console.log('otherTab moving')
						moveToWindow(movingTabs[j].id, 
									 windowArray[i].id, 
									 Window.id, 
									 newWindowIndex, 
									 movingTabs[j].index, 
									 childTabActive)
					}
					return
				}
			}
			
			// No child window was found for this window => create one
			//console.log('No child window found; creating new one')
			createWindow(activeTab.id,activeTab.windowId,activeTab.index,movingTabs)
		}
	});
}

/*
	Moves tab to left and optionally to far left
*/
function moveLeft(firstPlace) {
	//console.log('Moving active tab left; to first place: ' + firstPlace)
	chrome.tabs.query({active: true, lastFocusedWindow: true}, function (tab) {
		if(firstPlace) {
			chrome.tabs.move(tab[0].id,{index:0});
		} else {
			chrome.tabs.move(tab[0].id,{index:tab[0].index-1});
		}
	});
};

/*
	Moves tab to right and optionally to far right
*/
function moveRight(lastPlace) {
	//console.log('Moving active tab right; to last place: ' + lastPlace)
	chrome.tabs.query({active: true, lastFocusedWindow: true}, function (tab) {
		if(lastPlace) {
			chrome.tabs.move(tab[0].id,{index:-1})
		// at far right
		} else if((tab[0].index + 1) == numTabs)  {
			chrome.tabs.move(tab[0].id,{index:0})
		} else {
			chrome.tabs.move(tab[0].id,{index:tab[0].index+1})
		}
	});
}

/*
	Searches for a parent id for designated tab, returns null if not found
*/
function getParent(tabId) {
	//console.log('Searching for parent window for tab ' + tabId)
	// if array has not been defined yet then return null
	if(!tabArray.length)
		return null
	
	var i = returnIndex(tabId, tabArray)
	
	if(i || i == 0)
		return tabArray[i].ParentWindowId
	else
		return null
}

/*
	Creates new window with designated tab, and creates array entries for that 
	tab and the window including Parent Window and Original Position info
	Modified to move multiple tabs
*/
function createWindow(tabId, parentId, currentIndex, movingTabs) {
	var state = null
	var focused = null
	
	state = 'maximized'
	focused = true
		
	chrome.windows.create({tabId:tabId, focused:focused, state:state}, function(thisWindow) {
		// Update window array
		windowArray.push({"id":thisWindow.id,"ParentId":parentId})
		// Update tab array if tab already present
		//console.log('Updating tab information:')
		//console.log('CurrentWindowId: ' + thisWindow.id + ', ParentWindowId: ' + parentId + ', OldPosition: ' + currentIndex)
		var i = returnIndex(tabId, tabArray)
		
		if(i | i == 0) {
			tabArray[i].ParentWindowId = parentId
			tabArray[i].CurrentWindowId = thisWindow.id
			tabArray[i].OldPosition = currentIndex
		} else {
			// If tab is not already in array then give new entry
			//console.log('Tab did not already have an array entry, adding information now')
			tabArray.push({'id':tabId,'CurrentWindowId':thisWindow.id,'ParentWindowId':parentId,'OldPosition':currentIndex})
		}
		
		if(movingTabs.length) {
			//console.log('Multiple tabs supplied to createWindow()')
			for(var i=0; i < movingTabs.length; i++) {
				moveToWindow(movingTabs[i].id,thisWindow.id,parentId,newWindowIndex,movingTabs[i].index,childTabActive)
				
				// Update tab array
				var j = returnIndex(movingTabs[i].id,tabArray)
				if(i | i == 0) {
					tabArray[j].ParentWindowId = parentId
					tabArray[j].CurrentWindowId = thisWindow.id
					tabArray[j].OldPosition = movingTabs[i].index
					//console.log('Tab: ' + movingTabs[i].id + ' from position ' + movingTabs[i].index)
				} else {
					// If tab is not already in array then give new entry
					//console.log('Tab did not already have an array entry, adding information now')
					tabArray.push({'id':movingTabs[i].id,
						'CurrentWindowId':thisWindow.id,
						'ParentWindowId':parentId,
						'OldPosition':movingTabs[i].index})
				}
			}
		}
	});
}

/*
	Moves tab to a new window and updates its array entry
*/
function moveToWindow(TabId, TargetWindowId, CurrentWindowId, TargetIndex, CurrentIndex, makeActive) {
	console.log('moveToWindow -- TabId: ' + TabId)
	// Move tab
	chrome.tabs.move(TabId,{windowId:TargetWindowId,index:TargetIndex})
	if(makeActive)
		chrome.tabs.update(TabId,{active:true})
	
	// Update array if tab already present
	var i = returnIndex(TabId, tabArray)
	if(i || i == 0) {
		tabArray[i].CurrentWindowId = TargetWindowId
		tabArray[i].ParentWindowId = CurrentWindowId
		tabArray[i].OldPosition = CurrentIndex
	} else {
		// If tab is not already in array then give new entry
		tabArray.push({'id':TabId,'ParentWindowId':CurrentWindowId,'CurrentWindowId':TargetWindowId,'OldPosition':CurrentIndex})
	}
	
}