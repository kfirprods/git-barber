class GitBarber < Formula
    include Language::Python::Virtualenv

    desc "CLI tool to manage Git branches and files"
    homepage "https://github.com/kfirprods/git-barber"
    url "https://files.pythonhosted.org/packages/source/g/git-barber/git-barber-0.1.0.tar.gz"
    sha256 "80917f77388f105a90d817340812ff30f1caec64400151f43dd901fea1a80bdb"

    depends_on "python"

    resource "gitdb" do
        url "https://files.pythonhosted.org/packages/72/94/63b0fc47eb32792c7ba1fe1b694daec9a63620db1e313033d18140c2320a/gitdb-4.0.12.tar.gz"
        sha256 "5ef71f855d191a3326fcfbc0d5da835f26b13fbcba60c32c21091c349ffdb571"
    end

    resource "click" do
        url "https://files.pythonhosted.org/packages/b9/2e/0090cbf739cee7d23781ad4b89a9894a41538e4fcf4c31dcdd705b78eb8b/click-8.1.8.tar.gz"
        sha256 "ed53c9d8990d83c2a27deae68e4ee337473f6330c040a31d4225c9574d16096a"
    end
    
    resource "GitPython" do
        url "https://files.pythonhosted.org/packages/c0/89/37df0b71473153574a5cdef8f242de422a0f5d26d7a9e231e6f169b4ad14/gitpython-3.1.44.tar.gz"
        sha256 "c87e30b26253bf5418b01b0660f818967f3c503193838337fe5e573331249269"
    end
    
    resource "inquirer" do
        url "https://files.pythonhosted.org/packages/f3/06/ef91eb8f3feafb736aa33dcb278fc9555d17861aa571b684715d095db24d/inquirer-3.4.0.tar.gz"
        sha256 "8edc99c076386ee2d2204e5e3653c2488244e82cb197b2d498b3c1b5ffb25d0b"
    end

    def install
      virtualenv_install_with_resources
    end

    test do
      system "#{bin}/git-barber", "--help"
    end
  end