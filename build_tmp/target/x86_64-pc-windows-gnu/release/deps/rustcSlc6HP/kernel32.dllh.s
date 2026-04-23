# IMAGE_IMPORT_DESCRIPTOR
	.section	.idata$2
	.global	_head_Z__target_x86_64_pc_windows_gnu_release_deps_rustcSlc6HP_kernel32_dll_imports_lib
_head_Z__target_x86_64_pc_windows_gnu_release_deps_rustcSlc6HP_kernel32_dll_imports_lib:
	.rva	hname	#Ptr to image import by name list
	#this should be the timestamp, but NT sometimes
	#doesn't load DLLs when this is set.
	.long	0	# loaded time
	.long	0	# Forwarder chain
	.rva	__Z__target_x86_64_pc_windows_gnu_release_deps_rustcSlc6HP_kernel32_dll_imports_lib_iname	# imported dll's name
	.rva	fthunk	# pointer to firstthunk
#Stuff for compatibility
	.section	.idata$5
fthunk:
	.section	.idata$4
hname:
