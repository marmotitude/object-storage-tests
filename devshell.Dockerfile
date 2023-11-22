FROM marmotitude/object-storage-tests:main
RUN apk add \
      mandoc mandoc-doc \
      aws-cli-doc \
      rclone-doc rclone-fish-completion \
      openssh openssh-doc \
      gvim vim-doc \
      git git-doc \
      fish fish-doc \
      ripgrep ripgrep-doc ripgrep-fish-completion \
      bat bat-doc bat-fish-completion \
      chezmoi chezmoi-fish-completion \
