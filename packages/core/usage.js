


endowCompartmentWith = (compartmentGlobalThis, {globals, policy, wrapGlobalFunctionsTo}) => {
const getEndowments = makeGetEndowments({
    createFunctionWrapper,
		// also the wrapGlobalFunctionsTo so that getting endowments can configure the function wrapper
  });

	// pass all endowments with getOwnPropertyDescriptors and defineProperty onto the compartmentGlobalThis, including the part that handles writable fields etc.


}

// an option to pass an attenuator as a reference to endo policy config for the non-archive case would be beneficial to the simplicity and instance support situation for us.
// on the other hand, each endo app should get a new copy of attenuator in memory and treating attenuator as a singleton to hold on to the shared store for writable properties is probably gonna work too


const c = new Compartment(/*explicitly nothing here*/);
endowCompartmentWith(c.globalThis, {
	globals, // globals bag !== host globalThis
	compartmentPolicy: policy.resources[resourceId],
	wrapGlobalFunctionsTo: globalThis // the actual host globalThis - optional
})

